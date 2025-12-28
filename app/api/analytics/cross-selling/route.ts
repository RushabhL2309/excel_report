import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const salespersonId = searchParams.get('salespersonId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: any = {}
    if (salespersonId) {
      where.salespersonId = salespersonId
    }
    if (dateFrom || dateTo) {
      where.attemptDate = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo + 'T23:59:59Z') }),
      }
    }

    const attempts = await prisma.crossSellingAttempt.findMany({
      where,
      include: {
        salesperson: {
          select: { id: true, name: true },
        },
        customer: {
          select: { id: true, customerId: true },
        },
      },
    })

    // Get feedback to determine success
    const customerIds = [...new Set(attempts.map(a => a.customerId))]
    const feedbacks = await prisma.callFeedback.findMany({
      where: {
        customerId: { in: customerIds },
        nonVisitedReasons: { not: null },
      },
    })

    // Build metrics
    const metricsBySalesperson = new Map<string, {
      salespersonId: string
      salespersonName: string
      attempts: any[]
      totalAttempts: number
      successfulCrossSells: number
    }>()

    for (const attempt of attempts) {
      const key = attempt.salespersonId
      if (!metricsBySalesperson.has(key)) {
        metricsBySalesperson.set(key, {
          salespersonId: attempt.salespersonId,
          salespersonName: attempt.salespersonName,
          attempts: [],
          totalAttempts: 0,
          successfulCrossSells: 0,
        })
      }
      const metric = metricsBySalesperson.get(key)!
      metric.attempts.push(attempt)
      metric.totalAttempts++

      // Check if cross-sell was successful (customer visited suggested departments in future)
      const feedback = feedbacks.find(f => f.customerId === attempt.customerId)
      if (feedback?.nonVisitedReasons) {
        const reasons = feedback.nonVisitedReasons as any[]
        const successCount = reasons.filter((r: any) => 
          attempt.suggestedDepartments.includes(r.department) &&
          r.salespersonMentioned === true
        ).length
        if (successCount > 0) {
          metric.successfulCrossSells++
        }
      }
    }

    // Build department matrix
    const departmentMatrix = new Map<string, {
      fromDepartment: string
      toDepartment: string
      attempts: number
      successes: number
    }>()

    for (const attempt of attempts) {
      for (const suggestedDept of attempt.suggestedDepartments) {
        const key = `${attempt.customerDepartment}->${suggestedDept}`
        if (!departmentMatrix.has(key)) {
          departmentMatrix.set(key, {
            fromDepartment: attempt.customerDepartment,
            toDepartment: suggestedDept,
            attempts: 0,
            successes: 0,
          })
        }
        const matrix = departmentMatrix.get(key)!
        matrix.attempts++

        // Check success
        const feedback = feedbacks.find(f => f.customerId === attempt.customerId)
        if (feedback?.nonVisitedReasons) {
          const reasons = feedback.nonVisitedReasons as any[]
          const success = reasons.some((r: any) => 
            r.department === suggestedDept && r.salespersonMentioned === true
          )
          if (success) matrix.successes++
        }
      }
    }

    // Customer mindset breakdown
    const mindsetBreakdown = {
      didntKnow: 0,
      notInterested: 0,
      notInformed: 0,
      other: 0,
    }

    for (const feedback of feedbacks) {
      if (feedback.nonVisitedReasons) {
        const reasons = feedback.nonVisitedReasons as any[]
        for (const reason of reasons) {
          if (reason.reason === 'didnt_know') mindsetBreakdown.didntKnow++
          else if (reason.reason === 'not_interested') mindsetBreakdown.notInterested++
          else if (reason.reason === 'not_informed_by_salesperson') mindsetBreakdown.notInformed++
          else mindsetBreakdown.other++
        }
      }
    }

    const result = Array.from(metricsBySalesperson.values()).map(metric => ({
      ...metric,
      successRate: metric.totalAttempts > 0 
        ? (metric.successfulCrossSells / metric.totalAttempts) * 100 
        : 0,
      departmentMatrix: Array.from(departmentMatrix.values()).map(m => ({
        ...m,
        successRate: m.attempts > 0 ? (m.successes / m.attempts) * 100 : 0,
      })),
      customerMindsetBreakdown: mindsetBreakdown,
    }))

    return NextResponse.json({ metrics: result })
  } catch (error) {
    console.error('Error fetching cross-selling analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}



