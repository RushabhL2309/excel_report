import * as XLSX from 'xlsx'
import { MASTER_DEPARTMENTS, normalizeDepartment, formatDepartmentCounter } from './departments'

const UNKNOWN_DATE_KEY = '__unknown__'

export type CustomerVisitData = {
  customerId: string
  dateIso: string | null
  displayDate: string | null
  dateKey: string
  departmentsVisited: string[]
  departmentsNotVisited: string[]
  visitedCount: number
  totalDepartments: number
  voucherNos: string[]
}

export type CustomerData = {
  customerId: string
  customerName: string | null
  visits: CustomerVisitData[]
  totalVisits: number
}

export type ParsedCustomerData = {
  customers: CustomerData[]
  allDepartments: string[]
  dateLabels: Record<string, string>
}

const normalizeQuotes = (value: string) => value.replace(/[''']/g, "'")

const stringifyCell = (value: string | number | Date | null): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return ''
    return value.toString()
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return value.toString().trim()
}

const normalizeKey = (value: string | number | Date | null): string => {
  const raw = normalizeQuotes(stringifyCell(value))
  return raw.replace(/\s+/g, ' ').trim().toLowerCase()
}

const formatDisplayDate = (iso: string): string => {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

type DateInfo = {
  key: string
  iso: string | null
  display: string | null
}

const parseDateCell = (value: string | number | Date | null): DateInfo => {
  if (value === null || value === undefined || value === '') {
    return { key: UNKNOWN_DATE_KEY, iso: null, display: null }
  }

  if (value instanceof Date) {
    const iso = toIsoDate(value)
    return { key: iso, iso, display: formatDisplayDate(iso) }
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
      const iso = toIsoDate(date)
      return { key: iso, iso, display: formatDisplayDate(iso) }
    }
  }

  const text = stringifyCell(value)
  if (text === '') {
    return { key: UNKNOWN_DATE_KEY, iso: null, display: null }
  }

  const parsedDate = new Date(text)
  if (!Number.isNaN(parsedDate.getTime())) {
    const iso = toIsoDate(parsedDate)
    return { key: iso, iso, display: formatDisplayDate(iso) }
  }

  return {
    key: normalizeKey(text) || UNKNOWN_DATE_KEY,
    iso: null,
    display: text,
  }
}

// Department normalization functions are imported from departments.ts

export const parseCustomerData = (buffer: ArrayBuffer): ParsedCustomerData => {
  const workbook = XLSX.read(buffer, { type: 'array' })
  if (workbook.SheetNames.length === 0) {
    throw new Error('The workbook does not contain any sheets.')
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) {
    throw new Error('Unable to read the first worksheet.')
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: null,
  })

  if (rows.length === 0) {
    throw new Error('The worksheet is empty.')
  }

  const HEADER_ROW_NUMBER = 4
  const headerRowIndex =
    HEADER_ROW_NUMBER - 1 < rows.length ? HEADER_ROW_NUMBER - 1 : rows.findIndex((row) => row.some((value) => stringifyCell(value) !== ''))
  if (headerRowIndex === -1) {
    throw new Error('Unable to locate a header row in the worksheet.')
  }

  const headerRow = rows[headerRowIndex]
  const normalizedHeader = headerRow.map((cell) => normalizeQuotes(stringifyCell(cell)).trim())
  const headerLookup = normalizedHeader.map((label) => label.toLowerCase())

  const findHeaderIndex = (needles: string | string[], fromIndex = 0) => {
    const targets = Array.isArray(needles) ? needles : [needles]
    const loweredTargets = targets.map((item) => item.toLowerCase())
    for (let index = fromIndex; index < headerLookup.length; index += 1) {
      const headerLabel = headerLookup[index]
      if (!headerLabel) continue
      if (
        loweredTargets.some(
          (target) =>
            headerLabel === target ||
            headerLabel.includes(target) ||
            normalizedHeader[index].toLowerCase() === target
        )
      ) {
        return index
      }
    }
    return -1
  }

  const voucherNoIndex = findHeaderIndex(['voucher no'])
  const voucherDateIndex = findHeaderIndex(['voucher date', 'date'])
  const itemGroupIndex = findHeaderIndex(['itemgroup name', 'item group name', 'item group'])
  const counterIndex = findHeaderIndex(['counter name', 'counter'])
  const firstMobileIndex = findHeaderIndex(['mobile1', 'customer id', 'customer mobile'])
  const accountNameIndex = findHeaderIndex(['account name', 'customer name', 'account'])

  if (itemGroupIndex === -1 || firstMobileIndex === -1) {
    throw new Error('Failed to detect required columns. Please ensure headers like "ItemGroup Name" and "Mobile1" exist.')
  }

  // Use master departments list - don't extract from Excel
  const dateLabels = new Map<string, string>()

  // Map: customerKey -> Map: dateKey -> Set of departments (normalized base names only)
  const customerDateDepartments = new Map<string, Map<string, { departments: Set<string>, voucherNos: Set<string>, dateInfo: DateInfo }>>()
  const customerIds = new Map<string, string>() // normalized key -> original ID
  const customerNames = new Map<string, string>() // normalized key -> customer name

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    if (!row || row.every((cell) => stringifyCell(cell) === '')) {
      continue
    }

    const dateInfo = voucherDateIndex !== -1 ? parseDateCell(row[voucherDateIndex]) : { key: UNKNOWN_DATE_KEY, iso: null, display: null }
    if (dateInfo.iso) {
      if (!dateLabels.has(dateInfo.iso)) {
        dateLabels.set(dateInfo.iso, dateInfo.display ?? formatDisplayDate(dateInfo.iso))
      }
    }

    const rawDepartment = stringifyCell(row[itemGroupIndex])
    const rawCounter = counterIndex !== -1 ? stringifyCell(row[counterIndex]) : ''
    const rawCustomerId = stringifyCell(row[firstMobileIndex])
    const rawAccountName = accountNameIndex !== -1 ? stringifyCell(row[accountNameIndex]) : ''
    const voucherNo = voucherNoIndex !== -1 ? stringifyCell(row[voucherNoIndex]) : ''

    const customerKey = normalizeKey(rawCustomerId)
    // Normalize department to base name (without counter) for comparison
    const normalizedDept = normalizeDepartment(rawDepartment)

    // Only process if department is in master list
    if (!rawCustomerId || !normalizedDept || !MASTER_DEPARTMENTS.includes(normalizedDept as any)) {
      continue
    }

    // Store original customer ID and name
    if (customerKey && rawCustomerId) {
      customerIds.set(customerKey, rawCustomerId)
      if (rawAccountName && !customerNames.has(customerKey)) {
        customerNames.set(customerKey, rawAccountName)
      }
    }

    // Group by customer and date
    if (customerKey) {
      if (!customerDateDepartments.has(customerKey)) {
        customerDateDepartments.set(customerKey, new Map())
      }

      const dateMap = customerDateDepartments.get(customerKey)!
      const dateKey = dateInfo.iso || dateInfo.key

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          departments: new Set<string>(),
          voucherNos: new Set<string>(),
          dateInfo,
        })
      }

      const visitData = dateMap.get(dateKey)!
      // Store normalized department name (base name only, no counter)
      visitData.departments.add(normalizedDept)
      if (voucherNo) {
        visitData.voucherNos.add(voucherNo)
      }
    }
  }

  // Convert to output format - use master departments
  const allDepartments = Array.from(MASTER_DEPARTMENTS)
  const customers: CustomerData[] = []

  customerDateDepartments.forEach((dateMap, customerKey) => {
    const customerId = customerIds.get(customerKey) || customerKey
    const customerName = customerNames.get(customerKey) || null
    const visits: CustomerVisitData[] = []

    dateMap.forEach((visitData, dateKey) => {
      // Get unique visited departments (already normalized to master list)
      const departmentsVisited = Array.from(visitData.departments).filter(dept =>
        MASTER_DEPARTMENTS.includes(dept as any)
      ).sort()
      const departmentsNotVisited = allDepartments.filter(dept => !departmentsVisited.includes(dept))
      const voucherNos = Array.from(visitData.voucherNos).sort()

      visits.push({
        customerId,
        dateIso: visitData.dateInfo.iso,
        displayDate: visitData.dateInfo.iso
          ? (dateLabels.get(visitData.dateInfo.iso) ?? visitData.dateInfo.display ?? formatDisplayDate(visitData.dateInfo.iso))
          : visitData.dateInfo.display,
        dateKey,
        departmentsVisited,
        departmentsNotVisited,
        visitedCount: departmentsVisited.length,
        totalDepartments: allDepartments.length,
        voucherNos,
      })
    })

    // Sort visits by date (newest first)
    visits.sort((a, b) => {
      if (a.dateIso && b.dateIso) {
        return b.dateIso.localeCompare(a.dateIso)
      }
      if (a.dateIso) return -1
      if (b.dateIso) return 1
      return 0
    })

    customers.push({
      customerId,
      customerName,
      visits,
      totalVisits: visits.length,
    })
  })

  // Sort customers by ID
  customers.sort((a, b) => a.customerId.localeCompare(b.customerId))

  return {
    customers,
    allDepartments,
    dateLabels: Object.fromEntries(dateLabels.entries()),
  }
}



