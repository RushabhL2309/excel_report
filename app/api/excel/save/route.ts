import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MASTER_DEPARTMENTS, getNonVisitedDepartments } from '@/lib/departments'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { metrics, customerInteractions, availableDates, dateLabels } = data

    if (!customerInteractions || customerInteractions.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No customer interactions found' 
      }, { status: 400 })
    }

    // Process and save customers (batch process for better performance)
    const customerMap = new Map<string, string>() // normalizedCustomerId -> customer UUID
    const uniqueCustomers = new Map<string, { customerId: string; normalizedId: string }>()

    // First pass: collect unique customers
    for (const interaction of customerInteractions) {
      const normalizedId = (interaction.normalizedCustomerId || interaction.customerId.toLowerCase().trim()).replace(/\s+/g, '')
      if (normalizedId && !uniqueCustomers.has(normalizedId)) {
        uniqueCustomers.set(normalizedId, {
          customerId: interaction.customerId,
          normalizedId: normalizedId,
        })
      }
    }

    // Second pass: create/update customers
    for (const [normalizedId, customerData] of uniqueCustomers) {
      try {
        const customer = await prisma.customer.upsert({
          where: { normalizedCustomerId: normalizedId },
          update: {
            customerId: customerData.customerId,
            phone: customerData.customerId,
            updatedAt: new Date(),
          },
          create: {
            customerId: customerData.customerId,
            normalizedCustomerId: normalizedId,
            phone: customerData.customerId,
            visitCount: 0,
            totalIncentiveAmount: 0,
          },
        })
        customerMap.set(normalizedId, customer.id)
      } catch (error) {
        console.error(`Error upserting customer ${normalizedId}:`, error)
      }
    }

    // Group interactions by unique visit (customerId + date + voucherNo)
    const visitMap = new Map<string, {
      customerId: string
      normalizedCustomerId: string
      visitDate: Date
      voucherNo: string | null
      departments: Set<string>
      transactions: any[]
      salespersons: Set<string>
    }>()

    for (const interaction of customerInteractions) {
      const normalizedId = (interaction.normalizedCustomerId || interaction.customerId.toLowerCase().trim()).replace(/\s+/g, '')
      
      if (!normalizedId) continue
      
      // Ensure customer exists in map
      if (!customerMap.has(normalizedId)) {
        try {
          const customer = await prisma.customer.upsert({
            where: { normalizedCustomerId: normalizedId },
            update: {
              customerId: interaction.customerId,
              phone: interaction.customerId,
              updatedAt: new Date(),
            },
            create: {
              customerId: interaction.customerId,
              normalizedCustomerId: normalizedId,
              phone: interaction.customerId,
              visitCount: 0,
              totalIncentiveAmount: 0,
            },
          })
          customerMap.set(normalizedId, customer.id)
        } catch (error) {
          console.error(`Error creating customer ${normalizedId}:`, error)
          continue
        }
      }
      
      const visitDate = interaction.voucherDateIso 
        ? new Date(interaction.voucherDateIso + 'T00:00:00Z')
        : new Date()
      
      // Create unique visit key: customerId_date (one visit per customer per day)
      // Format date as YYYY-MM-DD to ensure consistent grouping
      const dateKey = interaction.voucherDateIso || visitDate.toISOString().split('T')[0]
      const visitKey = `${normalizedId}_${dateKey}`

      const customerDbId = customerMap.get(normalizedId)
      if (!customerDbId) {
        console.error(`Customer ID not found for normalizedId: ${normalizedId}`)
        continue
      }

      if (!visitMap.has(visitKey)) {
        visitMap.set(visitKey, {
          customerId: customerDbId,
          normalizedCustomerId: normalizedId,
          visitDate,
          voucherNo,
          departments: new Set<string>(),
          transactions: [],
          salespersons: new Set<string>(),
        })
      }

      const visit = visitMap.get(visitKey)!
      if (interaction.departmentLabel) {
        visit.departments.add(interaction.departmentLabel)
      }
      if (interaction.salesperson) {
        visit.salespersons.add(interaction.salesperson)
      }
      visit.transactions.push(interaction)
    }

    // Save visits and transactions
    let savedVisits = 0
    let savedTransactions = 0

    for (const [visitKey, visitData] of visitMap) {
      try {
        const departmentsVisited = Array.from(visitData.departments)
        const departmentsNotVisited = getNonVisitedDepartments(departmentsVisited, MASTER_DEPARTMENTS)

        // Find corresponding incentive amount from metrics
        let incentiveAmount = 0
        if (visitData.transactions.length > 0) {
          const firstTransaction = visitData.transactions[0]
          for (const metric of metrics || []) {
            for (const entry of metric.breakdown || []) {
              if (
                entry.customerId === firstTransaction.customerId &&
                entry.dateIso === firstTransaction.voucherDateIso
              ) {
                incentiveAmount = entry.amount || 0
                break
              }
            }
          }
        }

        // Check if visit already exists (by visitKey)
        const existingVisit = await prisma.customerVisit.findUnique({
          where: { visitKey },
          include: {
            transactions: true, // Get existing transactions to delete them
          },
        })

        let customerVisit
        const isNewVisit = !existingVisit

        if (existingVisit) {
          // Update existing visit - delete old transactions and create new ones
          // First, delete all existing transactions for this visit
          await prisma.visitTransaction.deleteMany({
            where: { visitId: existingVisit.id },
          })

          // Update the visit with new data
          customerVisit = await prisma.customerVisit.update({
            where: { visitKey },
            data: {
              visitDate: visitData.visitDate,
              departmentsVisited,
              departmentsNotVisited,
              departmentsCount: departmentsVisited.length,
              totalDepartmentsAvailable: MASTER_DEPARTMENTS.length,
              incentiveAmount,
              salespersons: Array.from(visitData.salespersons),
            },
          })
        } else {
          // Create new visit
          customerVisit = await prisma.customerVisit.create({
            data: {
              customerId: visitData.customerId,
              visitDate: visitData.visitDate,
              voucherNo: null, // No single voucher since multiple transactions per day
              visitKey,
              departmentsVisited,
              departmentsNotVisited,
              departmentsCount: departmentsVisited.length,
              totalDepartmentsAvailable: MASTER_DEPARTMENTS.length,
              incentiveAmount,
              salespersons: Array.from(visitData.salespersons),
            },
          })
        }

        savedVisits++

        // Save/update transactions for this visit
        for (const transaction of visitData.transactions) {
          try {
            await prisma.visitTransaction.create({
              data: {
                visitId: customerVisit.id,
                customerId: visitData.customerId,
                voucherNo: transaction.voucherNo || 'NOVOUCHER',
                voucherDate: transaction.voucherDateIso 
                  ? new Date(transaction.voucherDateIso + 'T00:00:00Z')
                  : visitData.visitDate,
                department: transaction.department || '',
                counter: transaction.counter || null,
                departmentLabel: transaction.departmentLabel || '',
                salesperson: transaction.salesperson || '',
              },
            })
            savedTransactions++
          } catch (error) {
            console.error(`Error creating transaction for visit ${customerVisit.id}:`, error)
          }
        }

        // Update customer statistics (only if new visit)
        if (!existingVisit) {
          try {
            const customer = await prisma.customer.findUnique({
              where: { id: visitData.customerId },
            })
            
            if (customer) {
              const currentVisitCount = customer.visitCount || 0
              const currentTotalIncentive = customer.totalIncentiveAmount || 0
              const shouldUpdateFirstVisit = !customer.firstVisitDate || visitData.visitDate < customer.firstVisitDate

              await prisma.customer.update({
                where: { id: visitData.customerId },
                data: {
                  visitCount: currentVisitCount + 1,
                  totalIncentiveAmount: currentTotalIncentive + incentiveAmount,
                  lastVisitDate: visitData.visitDate,
                  ...(shouldUpdateFirstVisit && { firstVisitDate: visitData.visitDate }),
                },
              })
            }
          } catch (error) {
            console.error(`Error updating customer stats for ${visitData.customerId}:`, error)
          }
        }
      } catch (error) {
        console.error(`Error processing visit ${visitKey}:`, error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${savedVisits} visits and ${savedTransactions} transactions`,
      stats: {
        customers: customerMap.size,
        visits: savedVisits,
        transactions: savedTransactions,
      }
    })
  } catch (error) {
    console.error('Error saving Excel data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save data',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
