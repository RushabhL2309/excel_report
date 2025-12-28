import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        visits: {
          orderBy: { visitDate: 'desc' },
          include: {
            transactions: {
              orderBy: { voucherDate: 'asc' },
            },
            crossSellAttempts: true,
          },
        },
        calls: {
          orderBy: { startedAt: 'desc' },
          include: {
            feedback: true,
            initiatedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        analytics: true,
        _count: {
          select: {
            visits: true,
            calls: true,
            feedbacks: true,
            crossSellAttempts: true,
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Calculate department preferences
    const departmentCounts = new Map<string, number>()
    const salespersonCounts = new Map<string, number>()

    customer.visits.forEach(visit => {
      visit.departmentsVisited.forEach(dept => {
        departmentCounts.set(dept, (departmentCounts.get(dept) || 0) + 1)
      })
      visit.salespersons.forEach(sp => {
        salespersonCounts.set(sp, (salespersonCounts.get(sp) || 0) + 1)
      })
    })

    const preferredDepartments = Array.from(departmentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dept]) => dept)

    const preferredSalespersons = Array.from(salespersonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sp]) => sp)

    return NextResponse.json({
      customer: {
        ...customer,
        preferredDepartments,
        preferredSalespersons,
        totalIncentiveAmount: customer.totalIncentiveAmount.toString(),
      },
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}



