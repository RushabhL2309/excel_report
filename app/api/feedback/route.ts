import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      callId,
      customerId,
      visitId,
      submittedBy,
      outcome,
      customerMood,
      rating,
      notes,
      requiresFollowUp,
      followUpDate,
      followUpReason,
      nonVisitedDepartmentsDiscussed,
      nonVisitedReasons,
    } = data

    // Helper function to get or create a default system user
    // TODO: Replace with actual authenticated user once auth is implemented
    async function getOrCreateDefaultUser(): Promise<string> {
      // Try to find an existing default user
      const defaultUser = await prisma.user.findFirst({
        where: {
          email: 'system@crm.local',
        },
      })

      if (defaultUser) {
        return defaultUser.id
      }

      // Create a default system user
      const newUser = await prisma.user.create({
        data: {
          email: 'system@crm.local',
          name: 'System User',
          passwordHash: 'placeholder', // Will be updated when auth is implemented
          role: 'SALESPERSON',
          isActive: true,
        },
      })

      return newUser.id
    }

    // Get call to extract visitId and initiatedBy if not provided
    let feedbackVisitId = visitId
    let submittedById = submittedBy
    
    if (callId) {
      const call = await prisma.call.findUnique({
        where: { id: callId },
        select: { visitId: true, initiatedBy: true },
      })
      
      if (call) {
        // Use call's visitId if not provided
        if (!feedbackVisitId && call.visitId) {
          feedbackVisitId = call.visitId
        }
        
        // Use call's initiatedBy if submittedBy not provided
        if (!submittedById && call.initiatedBy) {
          submittedById = call.initiatedBy
        }
      }
    }
    
    // If still no submittedBy, get/create default user
    if (!submittedById) {
      submittedById = await getOrCreateDefaultUser()
    }

    // Validate required fields
    if (!callId || !customerId || !outcome || !customerMood) {
      return NextResponse.json(
        { error: 'Missing required fields: callId, customerId, outcome, customerMood' },
        { status: 400 }
      )
    }

    // Create feedback
    const feedbackData: any = {
      callId,
      customerId,
      submittedBy: submittedById,
      outcome: outcome.toUpperCase(),
      customerMood: customerMood.toUpperCase(),
      rating: rating ? parseInt(rating.toString()) : null,
      notes: notes || null,
      requiresFollowUp: requiresFollowUp || false,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      followUpReason: followUpReason || null,
      nonVisitedDepartmentsDiscussed: nonVisitedDepartmentsDiscussed || [],
      nonVisitedReasons: nonVisitedReasons || null,
    }
    
    // Add visitId if available
    if (feedbackVisitId) {
      feedbackData.visitId = feedbackVisitId
    }
    
    const feedback = await prisma.callFeedback.create({
      data: feedbackData,
    })

    // Create follow-up reminder if required
    if (feedbackData.requiresFollowUp && feedbackData.followUpDate) {
      await prisma.followUpReminder.create({
        data: {
          customerId: feedbackData.customerId,
          callId: feedbackData.callId,
          createdBy: submittedById,
          assignedTo: submittedById, // Can be changed to assign to different person
          reminderDate: feedbackData.followUpDate,
          status: 'PENDING',
          notes: feedbackData.followUpReason || 'Follow-up required from call feedback',
        },
      })
    }

    return NextResponse.json({ success: true, feedback })
  } catch (error) {
    console.error('Error creating feedback:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { errorMessage, errorStack })
    return NextResponse.json(
      { 
        error: 'Failed to create feedback',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')
    const customerId = searchParams.get('customerId')

    if (callId) {
      const feedback = await prisma.callFeedback.findUnique({
        where: { callId },
        include: {
          call: true,
          customer: true,
          submittedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      })
      return NextResponse.json({ feedback })
    }

    if (customerId) {
      const feedbacks = await prisma.callFeedback.findMany({
        where: { customerId },
        include: {
          call: true,
          submittedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      
      // Map feedbacks to include visitId
      const mappedFeedbacks = feedbacks.map(feedback => ({
        ...feedback,
        visitId: feedback.visitId || null,
      }))
      
      return NextResponse.json({ feedbacks: mappedFeedbacks })
    }

    return NextResponse.json(
      { error: 'callId or customerId required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}



