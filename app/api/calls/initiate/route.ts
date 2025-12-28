import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { customerId, visitId, salespersonId } = await request.json()

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      )
    }

    // Fetch customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    if (!customer.phone) {
      return NextResponse.json(
        { error: 'Customer phone number missing' },
        { status: 400 }
      )
    }

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

    // Handle salesperson/user - create or find a default system user for now
    let initiatedById: string
    
    if (salespersonId && salespersonId.length === 24 && /^[0-9a-fA-F]{24}$/.test(salespersonId)) {
      // Valid ObjectID format, try to find the user
      try {
        const salesperson = await prisma.user.findUnique({
          where: { id: salespersonId },
        })
        if (salesperson) {
          initiatedById = salesperson.id
        } else {
          // User not found, create/find default system user
          initiatedById = await getOrCreateDefaultUser()
        }
      } catch (err) {
        // Invalid ObjectID, create/find default system user
        initiatedById = await getOrCreateDefaultUser()
      }
    } else {
      // Invalid or missing salespersonId, create/find default system user
      initiatedById = await getOrCreateDefaultUser()
    }

    // Verify visitId if provided
    if (visitId) {
      const visit = await prisma.customerVisit.findUnique({
        where: { id: visitId },
      })
      if (!visit || visit.customerId !== customer.id) {
        return NextResponse.json(
          { error: 'Invalid visitId or visit does not belong to customer' },
          { status: 400 }
        )
      }
    }

    // Create call record
    const callData: any = {
      customerId: customer.id,
      initiatedBy: initiatedById,
      callType: 'OUTBOUND',
      status: 'INITIATED',
      startedAt: new Date(),
      provider: process.env.TELEPHONY_PROVIDER as any || null,
    }
    
    // Add visitId if provided
    if (visitId) {
      callData.visitId = visitId
    }
    
    const call = await prisma.call.create({
      data: callData,
    })

    // TODO: Integrate with telephony provider API
    // For now, we'll just create the call record
    // When telephony API credentials are provided, implement the actual call initiation
    
    /*
    Example implementation structure:
    const telephonyResponse = await initiateTelephonyCall({
      customerPhone: customer.phone,
      salespersonPhone: salesperson.phone,
      callId: call.id,
    })
    
    await prisma.call.update({
      where: { id: call.id },
      data: {
        providerCallId: telephonyResponse.callId,
        status: 'RINGING',
      },
    })
    */

    return NextResponse.json({
      callId: call.id,
      status: call.status,
      message: 'Call initiated. Telephony integration pending.',
    })
  } catch (error) {
    console.error('Error initiating call:', error)
    return NextResponse.json(
      { error: 'Failed to initiate call' },
      { status: 500 }
    )
  }
}



