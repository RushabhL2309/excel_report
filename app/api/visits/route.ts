import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const customerId = searchParams.get('customerId')
    const salesperson = searchParams.get('salesperson')
    const department = searchParams.get('department')

    const where: any = {}
    if (dateFrom || dateTo) {
      where.visitDate = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo + 'T23:59:59Z') }),
      }
    }
    if (customerId) {
      where.customerId = customerId
    }
    if (salesperson) {
      where.salespersons = { has: salesperson }
    }
    if (department) {
      where.departmentsVisited = { has: department }
    }

    const visits = await prisma.customerVisit.findMany({
      where,
      include: {
        customer: {
          select: { id: true, customerId: true, phone: true },
        },
        transactions: {
          orderBy: { voucherDate: 'asc' },
        },
        crossSellAttempts: true,
      },
      orderBy: { visitDate: 'desc' },
    })

    return NextResponse.json({ visits })
  } catch (error) {
    console.error('Error fetching visits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch visits' },
      { status: 500 }
    )
  }
}



