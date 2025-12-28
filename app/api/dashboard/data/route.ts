import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get all customers with their visits
    const customers = await prisma.customer.findMany({
      include: {
        visits: {
          orderBy: { visitDate: 'desc' },
          take: 1, // Get latest visit for each customer
        },
      },
      orderBy: { lastVisitDate: 'desc' },
    })

    // Get all salespeople metrics
    const visits = await prisma.customerVisit.findMany({
      include: {
        customer: true,
        transactions: {
          orderBy: { voucherDate: 'asc' },
        },
      },
      orderBy: { visitDate: 'desc' },
    })

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
      const visitDate = visit.visitDate.toISOString().split('T')[0]
      availableDates.add(visitDate)
      dateLabels[visitDate] = visit.visitDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })

      // Process each salesperson in this visit
      for (const salespersonName of visit.salespersons) {
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
          customerId: visit.customer.customerId,
          amount: Number(visit.incentiveAmount),
          departmentsVisited: visit.departmentsCount,
          visitedDepartments: visit.departmentsVisited,
          handledDepartments: visit.departmentsVisited, // Simplified - could be enhanced
          dateKey: visitDate,
          dateIso: visitDate,
          displayDate: dateLabels[visitDate],
        })

        // Add customer interactions from transactions
        visit.transactions.forEach(transaction => {
          customerInteractions.push({
            customerId: visit.customer.customerId,
            normalizedCustomerId: visit.customer.normalizedCustomerId,
            voucherNo: transaction.voucherNo,
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
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    )
  }
}

