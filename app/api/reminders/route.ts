import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')
    const customerId = searchParams.get('customerId')

    const where: any = {}
    if (status) {
      where.status = status.toUpperCase()
    }
    if (assignedTo) {
      where.assignedTo = assignedTo
    }
    if (customerId) {
      where.customerId = customerId
    }

    const reminders = await prisma.followUpReminder.findMany({
      where,
      include: {
        customer: {
          select: { id: true, customerId: true, phone: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { reminderDate: 'asc' },
    })

    return NextResponse.json({ reminders })
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { customerId, callId, createdBy, assignedTo, reminderDate, notes } = data

    const reminder = await prisma.followUpReminder.create({
      data: {
        customerId,
        callId: callId || null,
        createdBy,
        assignedTo: assignedTo || createdBy,
        reminderDate: new Date(reminderDate),
        status: 'PENDING',
        notes: notes || null,
      },
      include: {
        customer: true,
        assignee: true,
      },
    })

    return NextResponse.json({ success: true, reminder })
  } catch (error) {
    console.error('Error creating reminder:', error)
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    )
  }
}



