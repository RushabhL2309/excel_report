import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const salesperson = searchParams.get('salesperson')
    const department = searchParams.get('department')
    const minVisits = searchParams.get('minVisits')
    const search = searchParams.get('search')

    // Start with a simple query - MongoDB relation filters can be tricky
    const where: any = {}

    // Direct field filters work better with MongoDB
    if (minVisits) {
      where.visitCount = {
        gte: parseInt(minVisits),
      }
    }

    // Fetch all customers first, then filter by visit-related criteria in memory
    // This is more reliable with MongoDB's limitations
    const customers = await prisma.customer.findMany({
      where,
      include: {
        visits: {
          // Get visits without ordering (MongoDB nested orderBy can be problematic)
          take: 10,
        },
        _count: {
          select: { visits: true, calls: true },
        },
      },
    })

    // Sort visits by date in memory (more reliable than nested orderBy)
    customers.forEach(customer => {
      if (customer.visits && customer.visits.length > 0) {
        customer.visits.sort((a, b) => {
          const dateA = a.visitDate.getTime()
          const dateB = b.visitDate.getTime()
          return dateB - dateA // Descending order
        })
      }
    })

    // Filter by visit-related criteria in memory
    let filteredCustomers = customers

    if (dateFrom || dateTo || salesperson || department) {
      filteredCustomers = customers.filter(customer => {
        if (!customer.visits || customer.visits.length === 0) {
          return false
        }

        // Check if any visit matches the criteria
        return customer.visits.some(visit => {
          // Date filter
          if (dateFrom || dateTo) {
            const visitDate = visit.visitDate
            if (dateFrom && visitDate < new Date(dateFrom)) {
              return false
            }
            if (dateTo) {
              const endDate = new Date(dateTo + 'T23:59:59Z')
              if (visitDate > endDate) {
                return false
              }
            }
          }

          // Salesperson filter
          if (salesperson && !visit.salespersons.includes(salesperson)) {
            return false
          }

          // Department filter
          if (department && !visit.departmentsVisited.includes(department)) {
            return false
          }

          return true
        })
      })
    }

    // Sort customers by lastVisitDate in memory
    filteredCustomers.sort((a, b) => {
      if (!a.lastVisitDate && !b.lastVisitDate) return 0
      if (!a.lastVisitDate) return 1
      if (!b.lastVisitDate) return -1
      return b.lastVisitDate.getTime() - a.lastVisitDate.getTime()
    })

    // Map customers to result format (using filtered list)
    let result = filteredCustomers.map(customer => {
      const lastVisit = customer.visits && customer.visits.length > 0 ? customer.visits[0] : null

      return {
        id: customer.id,
        customerId: customer.customerId,
        phone: customer.phone,
        visitCount: customer.visitCount,
        totalIncentiveAmount: customer.totalIncentiveAmount.toString(),
        firstVisitDate: customer.firstVisitDate,
        lastVisitDate: customer.lastVisitDate,
        lastVisit: lastVisit ? {
          id: lastVisit.id,
          visitDate: lastVisit.visitDate.toISOString(),
          departmentsVisited: lastVisit.departmentsVisited || [],
          departmentsNotVisited: lastVisit.departmentsNotVisited || [],
          departmentsCount: lastVisit.departmentsCount || 0,
          totalDepartmentsAvailable: lastVisit.totalDepartmentsAvailable || 0,
        } : null,
        callCount: customer._count.calls,
      }
    })

    // Apply search filter if provided (MongoDB doesn't support 'contains' in Prisma queries)
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(customer => 
        customer.customerId?.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({ customers: result })
  } catch (error) {
    console.error('Error fetching customers:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { errorMessage, errorStack })
    return NextResponse.json(
      { 
        error: 'Failed to fetch customers',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}



