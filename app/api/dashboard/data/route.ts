import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get all salespeople metrics (visits)
    // Note: MongoDB doesn't support nested orderBy in Prisma, so we'll sort in memory
    const visits = await prisma.customerVisit.findMany({
      include: {
        customer: true,
        transactions: true, // Get all transactions without ordering
      },
      // MongoDB can handle top-level orderBy
      orderBy: { visitDate: 'desc' },
    })

    // Sort transactions in memory (MongoDB limitation)
    visits.forEach(visit => {
      if (visit.transactions && visit.transactions.length > 0) {
        visit.transactions.sort((a, b) => {
          return a.voucherDate.getTime() - b.voucherDate.getTime()
        })
      }
    })

    // If no visits, return empty data
    if (visits.length === 0) {
      return NextResponse.json({
        metrics: [],
        availableDates: [],
        dateLabels: {},
        customerInteractions: [],
      })
    }

    // Build salesperson metrics
    const salespersonMap = new Map<string, {
      name: string
      departments: Set<string>
      breakdown: Array<{
        customerId: string
        amount: number
        departmentsVisited: number | null
        visitedDepartments: string[]
        handledDepartments: string[]
        dateKey: string
        dateIso: string | null
        displayDate: string | null
      }>
    }>()

    const availableDates = new Set<string>()
    const dateLabels: Record<string, string> = {}
    const customerInteractions: any[] = []

    for (const visit of visits) {
      // Defensive check for required fields
      if (!visit.visitDate || !visit.customer || !visit.salespersons) {
        console.warn('Skipping visit with missing required fields:', visit.id)
        continue
      }

      const visitDate = visit.visitDate.toISOString().split('T')[0]
      availableDates.add(visitDate)
      dateLabels[visitDate] = visit.visitDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })

      // Process each salesperson in this visit
      if (!Array.isArray(visit.salespersons)) {
        console.warn('Visit has invalid salespersons array:', visit.id)
        continue
      }

      for (const salespersonName of visit.salespersons) {
        if (!salespersonName) continue // Skip empty salesperson names
        if (!salespersonMap.has(salespersonName)) {
          salespersonMap.set(salespersonName, {
            name: salespersonName,
            departments: new Set(),
            breakdown: [],
          })
        }

        const metric = salespersonMap.get(salespersonName)!
        
        // Add departments
        visit.departmentsVisited.forEach(dept => metric.departments.add(dept))

        // Add breakdown entry
        metric.breakdown.push({
          customerId: visit.customer.customerId || '',
          amount: Number(visit.incentiveAmount) || 0,
          departmentsVisited: visit.departmentsCount || 0,
          visitedDepartments: Array.isArray(visit.departmentsVisited) ? visit.departmentsVisited : [],
          handledDepartments: Array.isArray(visit.departmentsVisited) ? visit.departmentsVisited : [],
          dateKey: visitDate,
          dateIso: visitDate,
          displayDate: dateLabels[visitDate] || visitDate,
        })

        // Add customer interactions from transactions
        if (visit.transactions && Array.isArray(visit.transactions)) {
          visit.transactions.forEach(transaction => {
            if (!transaction) return // Skip null transactions
            
            customerInteractions.push({
              customerId: visit.customer.customerId || '',
              normalizedCustomerId: visit.customer.normalizedCustomerId || '',
              voucherNo: transaction.voucherNo || '',
              voucherDateIso: visitDate,
              voucherDateDisplay: dateLabels[visitDate],
              department: transaction.department || null,
              counter: transaction.counter || null,
              departmentLabel: transaction.departmentLabel || null,
              salesperson: transaction.salesperson || salespersonName,
            })
          })
        }
      }
    }

    // Convert to array and calculate totals
    const metrics = Array.from(salespersonMap.values()).map(metric => ({
      name: metric.name,
      departments: Array.from(metric.departments),
      totalIncentive: metric.breakdown.reduce((sum, entry) => sum + entry.amount, 0),
      breakdown: metric.breakdown.sort((a, b) => {
        if (a.dateIso && b.dateIso) {
          return b.dateIso.localeCompare(a.dateIso)
        }
        return b.amount - a.amount
      }),
    })).sort((a, b) => b.totalIncentive - a.totalIncentive || a.name.localeCompare(b.name))

    return NextResponse.json({
      metrics,
      availableDates: Array.from(availableDates).sort(),
      dateLabels,
      customerInteractions,
    })
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { errorMessage, errorStack })
    return NextResponse.json(
      { 
        error: 'Failed to load dashboard data',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

