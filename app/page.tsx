'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { useExcelData } from '@/contexts/ExcelDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { normalizeDepartment, formatDepartmentCounter, MASTER_DEPARTMENTS } from '@/lib/departments'

const UNKNOWN_DATE_KEY = '__unknown__'

type BreakdownEntry = {
  customerId: string
  customerName: string | null
  amount: number
  departmentsVisited: number | null
  visitedDepartments: string[]
  handledDepartments: string[]
  dateKey: string
  dateIso: string | null
  displayDate: string | null
}

type SalespersonMetric = {
  name: string
  departments: string[]
  totalIncentive: number
  breakdown: BreakdownEntry[]
}

type InternalBreakdown = {
  name: string
  breakdown: BreakdownEntry[]
}

type CustomerVisitInfo = {
  customerId: string
  customerName: string | null
  departments: Set<string>
  dateIso: string | null
  dateKey: string
}

type ParsedWorkbook = {
  metrics: SalespersonMetric[]
  availableDates: string[]
  dateLabels: Record<string, string>
  uniqueSubCategories: string[]
}

const normalizeQuotes = (value: string) => value.replace(/[’‘]/g, "'")

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

const addDaysToIso = (iso: string, days: number): string => {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return toIsoDate(date)
}

const calculateIncentiveForDepartments = (departmentCount: number): number => {
  if (departmentCount >= 5) return 80
  if (departmentCount === 4) return 60
  if (departmentCount === 3) return 40
  if (departmentCount === 2) return 20
  return 0
}

const parseWorkbook = (buffer: ArrayBuffer): ParsedWorkbook => {
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

  // Debug: Log detected headers
  console.log('Detected headers:', normalizedHeader)

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
  const firstSalesmanIndex = findHeaderIndex(['salesman name', 'sales person'])
  const departmentNameIndex = findHeaderIndex(['department name', 'department', 'dept name', 'main category'])
  const itemGroupIndex = findHeaderIndex(['itemgroup name', 'item group name', 'item group', 'sub category', 'subcategory'])
  const counterIndex = findHeaderIndex(['counter name', 'counter'])
  const firstMobileIndex = findHeaderIndex(['mobile1', 'customer id', 'customer mobile'])
  const accountNameIndex = findHeaderIndex(['account name', 'customer name', 'account'])
  const salesTypeIndex = findHeaderIndex(['sales type', 'type', 'transaction type', 'sale type'])

  // Debug: Log column indices
  console.log('Column indices:', {
    voucherNoIndex,
    voucherDateIndex,
    firstSalesmanIndex,
    departmentNameIndex,
    itemGroupIndex,
    counterIndex,
    firstMobileIndex,
    accountNameIndex,
    salesTypeIndex,
    headers: normalizedHeader
  })

  if (firstSalesmanIndex === -1 || itemGroupIndex === -1 || firstMobileIndex === -1) {
    const missingColumns = []
    if (firstSalesmanIndex === -1) missingColumns.push('Salesman Name')
    if (itemGroupIndex === -1) missingColumns.push('Item Group Name')
    if (firstMobileIndex === -1) missingColumns.push('Mobile1')
    throw new Error(
      `Failed to detect required columns: ${missingColumns.join(', ')}. ` +
      `Found headers: ${normalizedHeader.filter(h => h).join(', ')}. ` +
      `Please ensure your Excel file has columns named: "Salesman Name" (or "Sales Person"), "ItemGroup Name" (or "Item Group Name"), and "Mobile1" (or "Customer ID").`
    )
  }

  const salesmanDepartments = new Map<string, { name: string; departments: Set<string> }>()
  const customerVisits = new Map<string, CustomerVisitInfo>()
  const customerSalesmen = new Map<
    string,
    Map<string, { name: string; departments: Set<string> }>
  >()
  const breakdownMap = new Map<string, InternalBreakdown>()
  const availableDates = new Set<string>()
  const dateLabels = new Map<string, string>()

  // Track all unique Item Group Name values found in the data
  const uniqueItemGroups = new Set<string>()

  // Debug counters
  let totalRowsProcessed = 0
  let rowsSkippedSalesType = 0
  let rowsProcessedSuccessfully = 0

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    if (!row || row.every((cell) => stringifyCell(cell) === '')) {
      continue
    }

    totalRowsProcessed++

    // Extract Sales Type - ONLY process "Sale" transactions
    // Make comparison case-insensitive and handle variations
    const salesTypeRaw = salesTypeIndex !== -1 ? stringifyCell(row[salesTypeIndex]) : ''
    const salesType = normalizeKey(salesTypeRaw)
    const isSale = salesType === 'sale' || salesType === 'sales' || salesTypeRaw.toLowerCase() === 'sale'

    // Skip ALL non-sale transactions (Return, Replacement, etc.)
    // But only if Sales Type column exists and has a value
    if (salesTypeIndex !== -1 && salesTypeRaw && !isSale) {
      rowsSkippedSalesType++
      continue
    }

    // If Sales Type column doesn't exist or is empty, process all rows (backward compatibility)

    const dateInfo = voucherDateIndex !== -1 ? parseDateCell(row[voucherDateIndex]) : { key: UNKNOWN_DATE_KEY, iso: null, display: null }
    if (dateInfo.iso) {
      availableDates.add(dateInfo.iso)
      if (!dateLabels.has(dateInfo.iso)) {
        dateLabels.set(dateInfo.iso, dateInfo.display ?? formatDisplayDate(dateInfo.iso))
      }
    }

    // Extract all fields
    const rawSalesman = stringifyCell(row[firstSalesmanIndex])
    const rawDepartmentName = departmentNameIndex !== -1 ? stringifyCell(row[departmentNameIndex]) : '' // Main category: Mens/Womens
    const rawItemGroup = stringifyCell(row[itemGroupIndex]) // Sub-category: shutting shirting, men's ethnic, etc.
    const rawCounter = counterIndex !== -1 ? stringifyCell(row[counterIndex]) : '' // Shop counter (billing location)
    const rawCustomerFromTable1 = stringifyCell(row[firstMobileIndex])
    const rawAccountName = accountNameIndex !== -1 ? stringifyCell(row[accountNameIndex]) : null
    const voucherNo = voucherNoIndex !== -1 ? stringifyCell(row[voucherNoIndex]) : ''

    const salesmanKey = normalizeKey(rawSalesman)
    const customerKey = normalizeKey(rawCustomerFromTable1)

    // Track unique Item Group Name values (sub-categories) found in the data
    // Store both original and normalized versions to handle spelling variations
    if (rawItemGroup && rawItemGroup.trim()) {
      const trimmed = rawItemGroup.trim()
      uniqueItemGroups.add(trimmed)
    }

    // Format department label using Item Group Name (sub-category) and counter
    // Use the imported formatDepartmentCounter which normalizes department names
    // For now, we'll use the raw Item Group Name with counter if formatDepartmentCounter doesn't match
    let departmentLabel = formatDepartmentCounter(rawItemGroup, rawCounter)

    // If formatDepartmentCounter returns empty (no match), use raw Item Group Name
    if (!departmentLabel && rawItemGroup) {
      if (rawCounter) {
        departmentLabel = `${rawItemGroup.trim()} (${rawCounter})`
      } else {
        departmentLabel = rawItemGroup.trim()
      }
    }

    // Debug: Log first few rows for troubleshooting
    if (totalRowsProcessed <= 3) {
      console.log('Sample row data:', {
        rowIndex: rowIndex + 1,
        rawSalesman,
        rawDepartmentName,
        rawItemGroup,
        rawCounter,
        rawCustomerFromTable1,
        salesTypeRaw,
        isSale,
        departmentLabel
      })
    }

    // Build salesman-department map (for general incentive calculation)
    // Process ALL departments found in Item Group Name (no filtering)
    if (salesmanKey && departmentLabel) {
      if (!salesmanDepartments.has(salesmanKey)) {
        salesmanDepartments.set(salesmanKey, {
          name: rawSalesman || 'Unknown Salesman',
          departments: new Set(),
        })
      }
      salesmanDepartments.get(salesmanKey)!.departments.add(departmentLabel)
      rowsProcessedSuccessfully++
    }

    // For customer-salesman mapping (used in incentive calculation)
    // Process ALL rows that pass Sales Type filter (no department filtering)
    if (salesmanKey && customerKey && departmentLabel) {
      const visitKey = `${customerKey}__${dateInfo.key}`
      if (!customerSalesmen.has(visitKey)) {
        customerSalesmen.set(visitKey, new Map())
      }
      if (!customerSalesmen.get(visitKey)!.has(salesmanKey)) {
        customerSalesmen
          .get(visitKey)!
          .set(salesmanKey, {
            name: rawSalesman || 'Unknown Salesman',
            departments: new Set<string>(),
          })
      }
      customerSalesmen.get(visitKey)!.get(salesmanKey)!.departments.add(departmentLabel)
    }

    // For customer visits (used in incentive calculation)
    // Process ALL rows that pass Sales Type filter (no department filtering)
    if (customerKey && departmentLabel) {
      const visitKey = `${customerKey}__${dateInfo.key}`
      if (!customerVisits.has(visitKey)) {
        customerVisits.set(visitKey, {
          customerId: rawCustomerFromTable1,
          customerName: rawAccountName || null,
          departments: new Set<string>(),
          dateIso: dateInfo.iso,
          dateKey: dateInfo.key,
        })
      }
      customerVisits.get(visitKey)!.departments.add(departmentLabel)
    }

    // Incentive table rows are no longer required; incentives will be calculated after parsing
  }

  customerVisits.forEach((visitInfo, visitKey) => {
    const salesmenForVisit = customerSalesmen.get(visitKey)
    if (!salesmenForVisit || salesmenForVisit.size === 0) {
      return
    }

    const uniqueVisitedDepartments = new Set(visitInfo.departments)
    salesmenForVisit.forEach(({ departments }) => {
      departments.forEach((dept) => uniqueVisitedDepartments.add(dept))
    })

    const departmentsVisitedCount = uniqueVisitedDepartments.size

    const incentiveAmount = calculateIncentiveForDepartments(departmentsVisitedCount)
    if (incentiveAmount === 0) {
      return
    }

    const displayDate = visitInfo.dateIso
      ? dateLabels.get(visitInfo.dateIso) ?? formatDisplayDate(visitInfo.dateIso)
      : null

    salesmenForVisit.forEach(({ name, departments }, salesmanKey) => {
      if (!breakdownMap.has(salesmanKey)) {
        breakdownMap.set(salesmanKey, {
          name,
          breakdown: [],
        })
      }

      breakdownMap.get(salesmanKey)!.breakdown.push({
        customerId: visitInfo.customerId,
        customerName: visitInfo.customerName,
        amount: incentiveAmount,
        departmentsVisited: departmentsVisitedCount,
        visitedDepartments: Array.from(uniqueVisitedDepartments),
        handledDepartments: Array.from(departments),
        dateKey: visitInfo.dateKey,
        dateIso: visitInfo.dateIso,
        displayDate,
      })
    })
  })

  const metrics: SalespersonMetric[] = []

  breakdownMap.forEach(({ name, breakdown }, key) => {
    const departments = salesmanDepartments.get(key)?.departments ?? new Set<string>()
    const sortedBreakdown = breakdown.sort((a, b) => {
      if (a.dateIso && b.dateIso) {
        if (a.dateIso !== b.dateIso) {
          return b.dateIso.localeCompare(a.dateIso)
        }
      } else if (a.dateIso) {
        return -1
      } else if (b.dateIso) {
        return 1
      }
      return b.amount - a.amount
    })
    const total = sortedBreakdown.reduce((sum, entry) => sum + entry.amount, 0)
    metrics.push({
      name,
      departments: Array.from(departments),
      totalIncentive: total,
      breakdown: sortedBreakdown,
    })
  })

  salesmanDepartments.forEach(({ name, departments }, key) => {
    if (!breakdownMap.has(key)) {
      metrics.push({
        name,
        departments: Array.from(departments),
        totalIncentive: 0,
        breakdown: [],
      })
    }
  })

  const sortedMetrics = metrics.sort((a, b) => b.totalIncentive - a.totalIncentive || a.name.localeCompare(b.name))
  const availableDatesList = Array.from(availableDates).sort()
  const dateLabelRecord = Object.fromEntries(dateLabels.entries())

  // Get unique sub-categories (Item Group Names) found in the data
  const uniqueItemGroupsArray = Array.from(uniqueItemGroups)
    .filter(item => item && item.trim() !== '') // Remove empty values
    .sort() // Sort alphabetically

  // Debug logging
  console.log('=== PARSING STATISTICS ===')
  console.log('Total rows processed:', totalRowsProcessed)
  console.log('Rows skipped (non-Sale):', rowsSkippedSalesType)
  console.log('Rows processed successfully:', rowsProcessedSuccessfully)
  console.log('Customer visits:', customerVisits.size)
  console.log('Salesmen found:', salesmanDepartments.size)
  console.log('Metrics calculated:', sortedMetrics.length)
  console.log('=== UNIQUE SUB-CATEGORIES (Item Group Names) ===')
  console.log('Total unique sub-categories found:', uniqueItemGroupsArray.length)
  console.log('Sub-categories:', uniqueItemGroupsArray)
  console.log('=== COLUMN DETECTION ===')
  console.log({
    itemGroupIndex,
    salesTypeIndex,
    departmentNameIndex,
    firstSalesmanIndex,
    firstMobileIndex,
    counterIndex,
    accountNameIndex,
    voucherNoIndex,
    voucherDateIndex
  })

  // If no data found, throw helpful error
  if (sortedMetrics.length === 0 && totalRowsProcessed > 0) {
    throw new Error(
      `No valid data found. ` +
      `Processed ${totalRowsProcessed} rows. ` +
      `Skipped ${rowsSkippedSalesType} rows (non-Sale transactions). ` +
      `Found ${uniqueItemGroupsArray.length} unique Item Group Names: ${uniqueItemGroupsArray.slice(0, 10).join(', ')}${uniqueItemGroupsArray.length > 10 ? '...' : ''}. ` +
      `Please check: 1) Sales Type = "Sale" (if column exists), 2) Item Group Name column has values, 3) Salesman Name and Mobile1 columns exist`
    )
  }

  return {
    metrics: sortedMetrics,
    availableDates: availableDatesList,
    dateLabels: dateLabelRecord,
    uniqueSubCategories: uniqueItemGroupsArray,
  }
}

type Timeframe = 'all' | 'day' | 'week'

type ComputedMetric = SalespersonMetric & {
  filteredBreakdown: BreakdownEntry[]
  filteredTotal: number
  customersCount: number
}

type DetailViewMode = 'departments' | 'incentives'

type ExpandedGroupState = Record<string, boolean>

const toTimestamp = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime()

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { setExcelData, fileName: contextFileName } = useExcelData()
  const [rawMetrics, setRawMetrics] = useState<SalespersonMetric[]>([])
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [dateLabels, setDateLabels] = useState<Record<string, string>>({})
  const [uniqueSubCategories, setUniqueSubCategories] = useState<string[]>([])
  const [selectedSalespersonName, setSelectedSalespersonName] = useState<string | null>(null)
  const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>('incentives')
  const [expandedGroups, setExpandedGroups] = useState<ExpandedGroupState>({})
  const [timeframe, setTimeframe] = useState<Timeframe>('all')
  const [selectedDay, setSelectedDay] = useState('')
  const [weekStart, setWeekStart] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)

  // Protect route - only Admin can access incentive page
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/customers') // Redirect telecaller to CRM page
    }
  }, [user, router])

  // Show access denied if not admin
  if (user && user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8 max-w-md">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This page is only accessible to Administrators.
            </p>
            <button
              onClick={() => router.push('/customers')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Go to Customer Details
            </button>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (availableDates.length > 0) {
      const latest = availableDates[availableDates.length - 1]
      setSelectedDay((current) => (current ? current : latest))
      setWeekStart((current) => (current ? current : latest))
    } else {
      setSelectedDay('')
      setWeekStart('')
    }
  }, [availableDates])

  const filterPredicate = useMemo(() => {
    if (timeframe === 'all') {
      return () => true
    }

    if (timeframe === 'day') {
      return (entry: BreakdownEntry) => {
        if (!selectedDay) return false
        return entry.dateIso === selectedDay
      }
    }

    return (entry: BreakdownEntry) => {
      if (!weekStart) return false
      if (!entry.dateIso) return false
      const startTs = toTimestamp(weekStart)
      if (Number.isNaN(startTs)) return false
      const endIso = addDaysToIso(weekStart, 6)
      const endTs = toTimestamp(endIso)
      const entryTs = toTimestamp(entry.dateIso)
      if (Number.isNaN(entryTs) || Number.isNaN(endTs)) {
        return false
      }
      return entryTs >= startTs && entryTs <= endTs
    }
  }, [timeframe, selectedDay, weekStart])

  const computedMetrics = useMemo<ComputedMetric[]>(() => {
    return rawMetrics
      .map((metric) => {
        const filteredBreakdown = metric.breakdown.filter(filterPredicate)
        const filteredTotal = filteredBreakdown.reduce((sum, entry) => sum + entry.amount, 0)
        const customersCount = new Set(filteredBreakdown.map((entry) => entry.customerId)).size
        return {
          ...metric,
          filteredBreakdown,
          filteredTotal,
          customersCount,
        }
      })
      .sort((a, b) => b.filteredTotal - a.filteredTotal || a.name.localeCompare(b.name))
  }, [rawMetrics, filterPredicate])

  const stats = useMemo(() => {
    const totalIncentive = computedMetrics.reduce((sum, metric) => sum + metric.filteredTotal, 0)
    const customersCovered = computedMetrics.reduce((set, metric) => {
      metric.filteredBreakdown.forEach((entry) => set.add(entry.customerId))
      return set
    }, new Set<string>())
    const totalSalespeople = rawMetrics.length
    const highest = computedMetrics[0]?.filteredTotal ?? 0
    const average = totalSalespeople > 0 ? totalIncentive / totalSalespeople : 0
    return {
      totalIncentive,
      totalSalespeople,
      customersCovered: customersCovered.size,
      highestIndividual: highest,
      averagePayout: average,
    }
  }, [computedMetrics, rawMetrics.length])

  const topPerformer = computedMetrics[0]

  const selectedSalesperson = useMemo(() => {
    if (!selectedSalespersonName) return null
    return computedMetrics.find((metric) => metric.name === selectedSalespersonName) ?? null
  }, [computedMetrics, selectedSalespersonName])

  const handleUpload = async (file: File) => {
    setIsParsing(true)
    setError(null)
    setSelectedSalespersonName(null)

    try {
      const buffer = await file.arrayBuffer()
      // Store in context for use in other pages
      setExcelData(buffer, file.name)
      // Parse for incentive calculations
      const parsed = parseWorkbook(buffer)

      // Debug logging
      console.log('Parsed workbook:', {
        metricsCount: parsed.metrics.length,
        availableDates: parsed.availableDates.length,
        metrics: parsed.metrics.map(m => ({
          name: m.name,
          totalIncentive: m.totalIncentive,
          breakdownCount: m.breakdown.length
        }))
      })

      if (parsed.metrics.length === 0) {
        setError('No data found. Please check: 1) Sales Type column contains "Sale" values, 2) Item Group Name matches the 6 departments (shutting shirting, men\'s ethnic, kurta, men\'s readymade, sarees, women\'s ethnic), 3) Required columns exist (Salesman Name, Item Group Name, Mobile1).')
      }

      setRawMetrics(parsed.metrics)
      setAvailableDates(parsed.availableDates)
      setDateLabels(parsed.dateLabels)
      setUniqueSubCategories(parsed.uniqueSubCategories)
      setTimeframe('all')
      setSelectedDay(parsed.availableDates[parsed.availableDates.length - 1] ?? '')
      setWeekStart(parsed.availableDates[parsed.availableDates.length - 1] ?? '')
    } catch (err) {
      console.error('Parse error:', err)
      setRawMetrics([])
      setAvailableDates([])
      setDateLabels({})
      setError(err instanceof Error ? err.message : 'Failed to parse Excel file. Please check the file format and ensure all required columns exist.')
    } finally {
      setIsParsing(false)
    }
  }

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    handleUpload(file)
  }

  const timeframeLabel = useMemo(() => {
    if (timeframe === 'all') {
      return 'All time'
    }
    if (timeframe === 'day') {
      if (!selectedDay) return 'Select a day'
      return dateLabels[selectedDay] ?? formatDisplayDate(selectedDay)
    }
    if (!weekStart) return 'Select a week'
    const weekEnd = addDaysToIso(weekStart, 6)
    const startLabel = dateLabels[weekStart] ?? formatDisplayDate(weekStart)
    const endLabel = dateLabels[weekEnd] ?? formatDisplayDate(weekEnd)
    return `${startLabel} – ${endLabel}`
  }, [dateLabels, selectedDay, timeframe, weekStart])

  const groupedBreakdown = useMemo(() => {
    if (!selectedSalesperson) return []
    const groups = new Map<string, { key: string; label: string; entries: BreakdownEntry[]; total: number }>()

    selectedSalesperson.filteredBreakdown.forEach((entry) => {
      const key = entry.dateIso ?? entry.dateKey
      const label = entry.dateIso
        ? dateLabels[entry.dateIso] ?? formatDisplayDate(entry.dateIso)
        : entry.displayDate ?? 'Unknown date'
      if (!groups.has(key)) {
        groups.set(key, { key, label, entries: [], total: 0 })
      }
      const group = groups.get(key)!
      group.entries.push(entry)
      group.total += entry.amount
    })

    return Array.from(groups.values()).sort((a, b) => {
      const aIso = a.entries[0]?.dateIso
      const bIso = b.entries[0]?.dateIso
      if (aIso && bIso && aIso !== bIso) {
        return bIso.localeCompare(aIso)
      }
      return b.total - a.total
    })
  }, [dateLabels, selectedSalesperson])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Salesperson Incentives</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Upload the consolidated Excel file to analyse incentives per salesperson.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Incentive</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-3">₹{stats.totalIncentive.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Sum of incentives across all filtered salespeople.</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Salespeople</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-3">{stats.totalSalespeople}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Unique salespersons found in the workbook.</p>
          </div>

          <div
            onClick={() => setShowCustomerModal(true)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all"
          >
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Customers</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-3">{stats.customersCovered}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Customers with incentives in the selected timeline. Click to view list.</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Incentive</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-3">₹{stats.averagePayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Average payout per salesperson in scope.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 lg:col-span-2">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Excel Workbook</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                The file should contain the three tables (Salesman vs Department, Customer Department Visits, Incentive Distribution) laid out exactly as in your template.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select file</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={onFileChange}
                  className="mt-2 block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </label>
              {contextFileName && (
                <p className="text-sm text-gray-600 dark:text-gray-400">Uploaded file: {contextFileName}</p>
              )}
              {isParsing && <p className="text-sm text-blue-600 dark:text-blue-400">Parsing workbook…</p>}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Error parsing file:</p>
                  <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap">{error}</p>
                </div>
              )}
              {uniqueSubCategories.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                    Found {uniqueSubCategories.length} Unique Sub-Categories (Item Group Names):
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {uniqueSubCategories.map((category, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!isParsing && rawMetrics.length === 0 && !error && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">No incentive data loaded yet.</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Upload the Excel workbook to see results. Make sure your file contains:
                  </p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-400 mt-2 list-disc list-inside space-y-1">
                    <li>Sales Type column with "Sale" values (if column exists)</li>
                    <li>Item Group Name column with sub-category values</li>
                    <li>Required columns: Salesman Name, Mobile1, Voucher Date</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Top Performer</h2>
            </div>
            <div className="p-6">
              {!topPerformer ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Upload a workbook and apply a timeline to identify the leading salesperson.</p>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{topPerformer.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Departments: {topPerformer.departments.length > 0 ? topPerformer.departments.join(', ') : 'Not available'}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">₹{topPerformer.filteredTotal.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Across {topPerformer.customersCount} customers in {timeframeLabel}.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 lg:col-span-3">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Timeline Filter</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Incentives are counted only when customers visit multiple departments on the same day.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <select
                  value={timeframe}
                  onChange={(event) => {
                    const value = event.target.value as Timeframe
                    setTimeframe(value)
                    if (value === 'day' && selectedDay === '' && availableDates.length > 0) {
                      setSelectedDay(availableDates[availableDates.length - 1])
                    }
                    if (value === 'week' && weekStart === '' && availableDates.length > 0) {
                      setWeekStart(availableDates[availableDates.length - 1])
                    }
                  }}
                  className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All time</option>
                  <option value="day">Specific day</option>
                  <option value="week">Specific week</option>
                </select>
                {timeframe === 'day' && (
                  <input
                    type="date"
                    value={selectedDay}
                    onChange={(event) => setSelectedDay(event.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
                {timeframe === 'week' && (
                  <input
                    type="date"
                    value={weekStart}
                    onChange={(event) => setWeekStart(event.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
            <div className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
              Current view: {timeframeLabel}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Salesperson Incentives</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click a row to view the detailed incentive breakdown for the selected timeline.
              </p>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {computedMetrics.length} salespeople
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Salesperson
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Customers
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Total Incentive
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {computedMetrics.map((metric) => {
                  const isSelected = selectedSalespersonName === metric.name
                  return (
                    <Fragment key={metric.name}>
                      <tr
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSalespersonName(null)
                            setExpandedGroups({})
                          } else {
                            setSelectedSalespersonName(metric.name)
                            setDetailViewMode('incentives')
                            setExpandedGroups({})
                          }
                        }}
                        className={`cursor-pointer transition hover:bg-blue-50 dark:hover:bg-gray-700 ${isSelected ? 'bg-blue-50/80 dark:bg-gray-700/80' : ''
                          }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{metric.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{metric.customersCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-gray-900 dark:text-white">₹{metric.filteredTotal.toLocaleString()}</td>
                      </tr>
                      {isSelected && (
                        <tr>
                          <td colSpan={3} className="px-6 pb-6">
                            <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                              <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{metric.name}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {metric.filteredBreakdown.length} incentive entries across {metric.customersCount} customers.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setDetailViewMode('departments')}
                                    className={`rounded-md px-3 py-2 text-xs font-medium ${detailViewMode === 'departments'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                                      }`}
                                  >
                                    Departments
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDetailViewMode('incentives')}
                                    className={`rounded-md px-3 py-2 text-xs font-medium ${detailViewMode === 'incentives'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                                      }`}
                                  >
                                    Detailed Info
                                  </button>
                                </div>
                              </div>
                              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4">
                                {detailViewMode === 'departments' ? (
                                  metric.departments.length === 0 ? (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      No department information recorded for this salesperson.
                                    </p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {metric.departments.map((department) => (
                                        <span
                                          key={department}
                                          className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 text-xs font-medium text-blue-800 dark:text-blue-200"
                                        >
                                          {department}
                                        </span>
                                      ))}
                                    </div>
                                  )
                                ) : groupedBreakdown.length === 0 ? (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    No incentive entries recorded for this salesperson in the selected timeline.
                                  </p>
                                ) : (
                                  <div className="space-y-4">
                                    {groupedBreakdown.map((group) => (
                                      <div key={group.key} className="rounded-md border border-gray-200 dark:border-gray-700">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedGroups((current) => ({
                                              ...current,
                                              [group.key]: !current[group.key],
                                            }))
                                          }
                                          className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-gray-800 px-4 py-3"
                                        >
                                          <div className="text-left">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{group.label}</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">{group.entries.length} entries</p>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <p className="text-base font-semibold text-gray-900 dark:text-white">₹{group.total.toLocaleString()}</p>
                                            <span className="text-xs font-medium text-blue-600 dark:text-blue-300">
                                              {expandedGroups[group.key] ? 'Hide details' : 'Show details'}
                                            </span>
                                          </div>
                                        </button>
                                        {expandedGroups[group.key] && (
                                          <ul className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900/40">
                                            {group.entries.map((entry, index) => (
                                              <li key={`${entry.customerId}-${index}`} className="px-4 py-3">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                  <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                      {entry.customerName ? (
                                                        <>
                                                          <span className="font-semibold">{entry.customerName}</span>
                                                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-normal">
                                                            (Mobile: {entry.customerId})
                                                          </span>
                                                        </>
                                                      ) : (
                                                        <span>Customer ID: {entry.customerId}</span>
                                                      )}
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                      Departments visited: {entry.departmentsVisited ?? 'Unknown'}
                                                    </p>
                                                  </div>
                                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">₹{entry.amount.toLocaleString()}</p>
                                                </div>
                                                {(entry.visitedDepartments.length > 0 || entry.handledDepartments.length > 0) && (
                                                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-300">
                                                    {entry.visitedDepartments.length > 0 && (
                                                      <div>
                                                        <p className="font-semibold text-gray-700 dark:text-gray-200">Visited Departments</p>
                                                        <p>{entry.visitedDepartments.join(', ')}</p>
                                                      </div>
                                                    )}
                                                    {entry.handledDepartments.length > 0 && (
                                                      <div>
                                                        <p className="font-semibold text-gray-700 dark:text-gray-200">Handled by {metric.name}</p>
                                                        <p>{entry.handledDepartments.join(', ')}</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {computedMetrics.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No salespeople to display for the selected timeline.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Customer List Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCustomerModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Customer List</h2>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {computedMetrics.length > 0 ? (
                <div className="space-y-3">
                  {(() => {
                    // Get unique customers from all breakdown entries
                    const customerMap = new Map<string, { id: string, name: string | null, totalVisits: number }>()
                    computedMetrics.forEach(metric => {
                      metric.filteredBreakdown.forEach(entry => {
                        if (!customerMap.has(entry.customerId)) {
                          customerMap.set(entry.customerId, {
                            id: entry.customerId,
                            name: entry.customerName,
                            totalVisits: 1
                          })
                        } else {
                          const existing = customerMap.get(entry.customerId)!
                          existing.totalVisits++
                        }
                      })
                    })

                    const customers = Array.from(customerMap.values()).sort((a, b) => b.totalVisits - a.totalVisits)

                    return customers.map((customer, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              {customer.id}
                            </h3>
                            {customer.name && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                                {customer.name}
                              </p>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              {customer.totalVisits} {customer.totalVisits === 1 ? 'visit' : 'visits'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No customer data available. Upload an Excel file to see customers.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
