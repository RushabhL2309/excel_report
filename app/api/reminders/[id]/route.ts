import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reminderId } = await params
    const data = await request.json()
    const { status, notes } = data

    const updateData: any = {}
    if (status) {
      updateData.status = status.toUpperCase()
      if (status.toUpperCase() === 'COMPLETED') {
        updateData.completedAt = new Date()
      }
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }

    const reminder = await prisma.followUpReminder.update({
      where: { id: reminderId },
      data: updateData,
      include: {
        customer: true,
        assignee: true,
      },
    })

    return NextResponse.json({ success: true, reminder })
  } catch (error) {
    console.error('Error updating reminder:', error)
    return NextResponse.json(
      { error: 'Failed to update reminder' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reminderId } = await params

    await prisma.followUpReminder.update({
      where: { id: reminderId },
      data: { status: 'DISMISSED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reminder:', error)
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    )
  }
}



