// Shared TypeScript types for the application

export type NonVisitReason = {
  department: string
  reason: 'didnt_know' | 'not_interested' | 'no_time' | 'not_informed_by_salesperson' | 'budget_constraint' | 'other'
  reasonDetails?: string
  salespersonMentioned?: boolean
}

export type CustomerVisitSummary = {
  visitId: string
  visitDate: string
  departmentsVisited: string[]
  departmentsNotVisited: string[]
  departmentsCount: number
  totalDepartmentsAvailable: number
  incentiveAmount: number
  salespersons: string[]
}

export type CrossSellingMetrics = {
  salespersonId: string
  salespersonName: string
  totalAttempts: number
  successfulCrossSells: number
  successRate: number
  departmentMatrix: Array<{
    fromDepartment: string
    toDepartment: string
    attempts: number
    successes: number
    successRate: number
  }>
  customerMindsetBreakdown: {
    didntKnow: number
    notInterested: number
    notInformed: number
    other: number
  }
}



