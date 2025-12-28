import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    // This will need to be customized based on your telephony provider
    // Example structure for Exotel/Knowlarity/TeleCMI
    
    const providerCallId = payload.CallSid || payload.callId || payload.CallId
    const status = payload.CallStatus || payload.status
    const duration = payload.Duration ? parseInt(payload.Duration) : null
    const recordingUrl = payload.RecordingUrl || payload.recordingUrl

    if (!providerCallId) {
      return NextResponse.json(
        { error: 'Provider call ID not found' },
        { status: 400 }
      )
    }

    // Find call by provider call ID
    const call = await prisma.call.findFirst({
      where: { providerCallId },
    })

    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      )
    }

    // Map provider status to our CallStatus enum
    let mappedStatus = call.status
    if (status) {
      const statusMap: Record<string, any> = {
        'initiated': 'INITIATED',
        'ringing': 'RINGING',
        'answered': 'ANSWERED',
        'completed': 'COMPLETED',
        'failed': 'FAILED',
        'no-answer': 'NO_ANSWER',
        'busy': 'FAILED',
      }
      mappedStatus = statusMap[status.toLowerCase()] || call.status
    }

    // Update call record
    const updatedCall = await prisma.call.update({
      where: { id: call.id },
      data: {
        status: mappedStatus,
        duration: duration || call.duration,
        recordingUrl: recordingUrl || call.recordingUrl,
        endedAt: mappedStatus === 'COMPLETED' || mappedStatus === 'FAILED' 
          ? new Date() 
          : call.endedAt,
        updatedAt: new Date(),
      },
    })

    // Create audit log
    await prisma.callAuditLog.create({
      data: {
        callId: call.id,
        action: 'status_changed',
        performedBy: call.initiatedBy,
        details: {
          previousStatus: call.status,
          newStatus: mappedStatus,
          duration,
          providerPayload: payload,
        },
      },
    })

    return NextResponse.json({ success: true, call: updatedCall })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}



