// Master Department List - This should match your actual departments
// Update this list based on your retail store's actual departments

export const MASTER_DEPARTMENTS = [
  'MENS ETHNICS',
  'WOMENS WEAR',
  'KIDS WEAR',
  'FOOTWEAR',
  'ACCESSORIES',
  'HOME DECOR',
]

export type MasterDepartment = {
  id: string
  name: string
  displayOrder: number
  isActive: boolean
}

/**
 * Normalize department name for consistent comparison
 */
export const normalizeDepartment = (department: string): string => {
  const normalized = department.trim().toUpperCase()
  
  // Handle variations
  if (normalized === "MEN'S ACCESSORIES" || normalized === 'MENS ACCESSORIES') {
    return 'MENS ETHNICS'
  }
  
  return normalized
}

/**
 * Get list of departments that were NOT visited given a list of visited departments
 */
export const getNonVisitedDepartments = (
  visitedDepartments: string[],
  masterList: string[] = MASTER_DEPARTMENTS
): string[] => {
  const normalizedVisited = visitedDepartments.map(dept => normalizeDepartment(dept))
  return masterList.filter(
    masterDept => !normalizedVisited.includes(normalizeDepartment(masterDept))
  )
}

/**
 * Calculate department visit statistics
 */
export const calculateDepartmentStats = (
  visitedDepartments: string[],
  masterList: string[] = MASTER_DEPARTMENTS
) => {
  const normalizedVisited = visitedDepartments.map(dept => normalizeDepartment(dept))
  const notVisited = masterList.filter(
    masterDept => !normalizedVisited.includes(normalizeDepartment(masterDept))
  )
  
  return {
    visited: normalizedVisited,
    notVisited,
    visitedCount: normalizedVisited.length,
    totalAvailable: masterList.length,
    visitPercentage: masterList.length > 0 
      ? (normalizedVisited.length / masterList.length) * 100 
      : 0
  }
}



