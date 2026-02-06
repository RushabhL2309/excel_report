/**
 * Master Department List
 * These are the official departments in the shop
 */

export const MASTER_DEPARTMENTS = [
  'shutting shirting',
  "men's ethnic",
  'kurta',
  "men's readymade",
  'sarees',
  "women's ethnic",
] as const

export type MasterDepartment = typeof MASTER_DEPARTMENTS[number]

/**
 * Normalize department names from Excel to match master list
 * Handles variations and common misspellings
 */
export const normalizeDepartment = (department: string): string => {
  const normalized = department.toLowerCase().trim()
  
  // Handle common variations
  const variations: Record<string, string> = {
    // Men's variations
    'mens accessories': "men's ethnic",
    "men's accessories": "men's ethnic",
    'mens ethnic': "men's ethnic",
    'mens ethnics': "men's ethnic",
    'men ethnic': "men's ethnic",
    'men ethnics': "men's ethnic",
    'mens readymade': "men's readymade",
    'men readymade': "men's readymade",
    'shirting': 'shutting shirting',
    'shirting shutting': 'shutting shirting',
    'shutting': 'shutting shirting',
    
    // Women's variations
    'womens ethnic': "women's ethnic",
    'womens ethnis': "women's ethnic",
    'women ethnic': "women's ethnic",
    'women ethnis': "women's ethnic",
    'saree': 'sarees',
    'sari': 'sarees',
    'saris': 'sarees',
  }
  
  // Check exact match first
  if (MASTER_DEPARTMENTS.includes(normalized as MasterDepartment)) {
    return normalized
  }
  
  // Check variations
  if (variations[normalized]) {
    return variations[normalized]
  }
  
  // Check if it contains any master department name
  for (const masterDept of MASTER_DEPARTMENTS) {
    if (normalized.includes(masterDept) || masterDept.includes(normalized)) {
      return masterDept
    }
  }
  
  // Return original if no match found (will be filtered out)
  return normalized
}

/**
 * Format department with counter name
 */
export const formatDepartmentCounter = (department: string, counter: string): string => {
  const normalizedDepartment = normalizeDepartment(department)
  
  // Only include in master list if it matches
  if (!MASTER_DEPARTMENTS.includes(normalizedDepartment as MasterDepartment)) {
    // If not in master list, return empty or original based on your preference
    // For now, we'll return empty to filter out non-master departments
    return ''
  }
  
  if (normalizedDepartment && counter) {
    return `${normalizedDepartment} (${counter})`
  }
  if (normalizedDepartment) {
    return normalizedDepartment
  }
  return ''
}

/**
 * Check if a department is in the master list
 */
export const isMasterDepartment = (department: string): boolean => {
  const normalized = normalizeDepartment(department)
  return MASTER_DEPARTMENTS.includes(normalized as MasterDepartment)
}

/**
 * Get all master departments
 */
export const getAllMasterDepartments = (): readonly string[] => {
  return MASTER_DEPARTMENTS
}
