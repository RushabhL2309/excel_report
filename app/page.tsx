'use client'

import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

const UNKNOWN_DATE_KEY = '__unknown__'

type BreakdownEntry = {
  customerId: string
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
  departments: Set<string>
  dateIso: string | null
  dateKey: string
}

type CustomerInteraction = {
  customerId: string
  normalizedCustomerId: string
  voucherNo: string | null
  voucherDateIso: string | null
  voucherDateDisplay: string | null
  department: string | null
  counter: string | null
  departmentLabel: string | null
  salesperson: string
}

type ParsedWorkbook = {
  metrics: SalespersonMetric[]
  availableDates: string[]
  dateLabels: Record<string, string>
  customerInteractions: CustomerInteraction[]
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
  const itemGroupIndex = findHeaderIndex(['itemgroup name', 'item group name', 'item group'])
  const counterIndex = findHeaderIndex(['counter name', 'counter'])
  const firstMobileIndex = findHeaderIndex(['mobile1', 'customer id', 'customer mobile'])

  if (firstSalesmanIndex === -1 || itemGroupIndex === -1 || firstMobileIndex === -1) {
    throw new Error('Failed to detect the salesman/department table. Please ensure headers like "Salesman Name", "ItemGroup Name", and "Mobile1" exist.')
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
  const customerInteractions: CustomerInteraction[] = []

  const formatDepartmentCounter = (department: string, counter: string) => {
    if (department && counter) return `${department} (${counter})`
    if (department) return department
    if (counter) return counter
    return ''
  }

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    if (!row || row.every((cell) => stringifyCell(cell) === '')) {
      continue
    }

    const dateInfo = voucherDateIndex !== -1 ? parseDateCell(row[voucherDateIndex]) : { key: UNKNOWN_DATE_KEY, iso: null, display: null }
    if (dateInfo.iso) {
      availableDates.add(dateInfo.iso)
      if (!dateLabels.has(dateInfo.iso)) {
        dateLabels.set(dateInfo.iso, dateInfo.display ?? formatDisplayDate(dateInfo.iso))
      }
    }

    // Table 1: Salesman -> Department mapping and per-customer interactions
    const rawSalesman = stringifyCell(row[firstSalesmanIndex])
    const rawDepartment = stringifyCell(row[itemGroupIndex])
    const rawCounter = counterIndex !== -1 ? stringifyCell(row[counterIndex]) : ''
    const rawCustomerFromTable1 = stringifyCell(row[firstMobileIndex])
    const voucherNo = voucherNoIndex !== -1 ? stringifyCell(row[voucherNoIndex]) : ''

    const salesmanKey = normalizeKey(rawSalesman)
    const customerKey = normalizeKey(rawCustomerFromTable1)
    const departmentLabel = formatDepartmentCounter(rawDepartment, rawCounter)

    if (salesmanKey) {
      if (!salesmanDepartments.has(salesmanKey)) {
        salesmanDepartments.set(salesmanKey, {
          name: rawSalesman || 'Unknown Salesman',
          departments: new Set(),
        })
      }
      if (departmentLabel) {
        salesmanDepartments.get(salesmanKey)!.departments.add(departmentLabel)
      }
    }

    if (salesmanKey && customerKey) {
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
      if (departmentLabel) {
        customerSalesmen.get(visitKey)!.get(salesmanKey)!.departments.add(departmentLabel)
      }
    }

    if (customerKey) {
      const visitKey = `${customerKey}__${dateInfo.key}`
      if (!customerVisits.has(visitKey)) {
        customerVisits.set(visitKey, {
          customerId: rawCustomerFromTable1,
          departments: new Set<string>(),
          dateIso: dateInfo.iso,
          dateKey: dateInfo.key,
        })
      }
      if (departmentLabel) {
        customerVisits.get(visitKey)!.departments.add(departmentLabel)
      }
    }

    if (rawCustomerFromTable1) {
      customerInteractions.push({
        customerId: rawCustomerFromTable1,
        normalizedCustomerId: customerKey,
        voucherNo: voucherNo || null,
        voucherDateIso: dateInfo.iso,
        voucherDateDisplay: dateInfo.iso
          ? dateLabels.get(dateInfo.iso) ?? formatDisplayDate(dateInfo.iso)
          : dateInfo.display,
        department: rawDepartment || null,
        counter: rawCounter || null,
        departmentLabel: departmentLabel || null,
        salesperson: rawSalesman || 'Unknown Salesman',
      })
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

  return {
    metrics: sortedMetrics,
    availableDates: availableDatesList,
    dateLabels: dateLabelRecord,
    customerInteractions,
  }
}

type Timeframe = 'all' | 'day' | 'week'

type ComputedMetric = SalespersonMetric & {
  filteredBreakdown: BreakdownEntry[]
  filteredTotal: number
  customersCount: number
}

const toTimestamp = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime()

export default function Dashboard() {
  const [rawMetrics, setRawMetrics] = useState<SalespersonMetric[]>([])
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [dateLabels, setDateLabels] = useState<Record<string, string>>({})
  const [customerInteractions, setCustomerInteractions] = useState<CustomerInteraction[]>([])
  const [selectedSalespersonName, setSelectedSalespersonName] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<Timeframe>('all')
  const [selectedDay, setSelectedDay] = useState('')
  const [weekStart, setWeekStart] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

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

  const interactionsByCustomer = useMemo(() => {
    const map = new Map<string, CustomerInteraction[]>()
    customerInteractions.forEach((entry) => {
      const key = entry.normalizedCustomerId || entry.customerId
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(entry)
    })
    return map
  }, [customerInteractions])

  const customersWithInteractions = interactionsByCustomer.size

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
    setFileName(file.name)
    setSelectedSalespersonName(null)

    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseWorkbook(buffer)
      setRawMetrics(parsed.metrics)
      setAvailableDates(parsed.availableDates)
      setDateLabels(parsed.dateLabels)
      setCustomerInteractions(parsed.customerInteractions)
      setTimeframe('all')
      setSelectedDay(parsed.availableDates[parsed.availableDates.length - 1] ?? '')
      setWeekStart(parsed.availableDates[parsed.availableDates.length - 1] ?? '')
    } catch (err) {
      console.error(err)
      setRawMetrics([])
      setAvailableDates([])
      setDateLabels({})
      setCustomerInteractions([])
      setError(err instanceof Error ? err.message : 'Failed to parse Excel file.')
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Excel Report Dashboard</h1>
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

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Customers</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-3">{stats.customersCovered}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Customers with incentives in the selected timeline.</p>
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
              {fileName && (
                <p className="text-sm text-gray-600 dark:text-gray-400">Uploaded file: {fileName}</p>
              )}
              {isParsing && <p className="text-sm text-blue-600 dark:text-blue-400">Parsing workbook…</p>}
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              {!isParsing && rawMetrics.length === 0 && !error && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No incentive data loaded yet. Upload the Excel workbook to see results.
                </p>
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
              Current view: {timeframeLabel} · Parsed customers: {customersWithInteractions}
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
                    Departments
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
                    <tr
                      key={metric.name}
                      onClick={() => setSelectedSalespersonName(isSelected ? null : metric.name)}
                      className={`cursor-pointer transition hover:bg-blue-50 dark:hover:bg-gray-700 ${
                        isSelected ? 'bg-blue-50/80 dark:bg-gray-700/80' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{metric.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {metric.departments.length > 0 ? metric.departments.join(', ') : 'Not available'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{metric.customersCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-gray-900 dark:text-white">₹{metric.filteredTotal.toLocaleString()}</td>
                    </tr>
                  )
                })}
                {computedMetrics.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No salespeople to display for the selected timeline.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedSalesperson && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Incentive Breakdown – {selectedSalesperson.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total incentive ₹{selectedSalesperson.filteredTotal.toLocaleString()} across {selectedSalesperson.filteredBreakdown.length} entries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSalespersonName(null)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Clear selection
              </button>
            </div>
            <div className="p-6 space-y-6">
              {groupedBreakdown.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No incentive entries recorded for this salesperson in the selected timeline.</p>
              ) : (
                groupedBreakdown.map((group) => (
                  <div key={group.key} className="border border-gray-200 dark:border-gray-700 rounded-md">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{group.label}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{group.entries.length} entries</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">₹{group.total.toLocaleString()}</p>
                    </div>
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {group.entries.map((entry, index) => (
                        <li key={`${entry.customerId}-${index}`} className="px-4 py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">Customer: {entry.customerId}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Departments visited: {entry.departmentsVisited ?? 'Unknown'}
                              </p>
                            </div>
                            <p className="text-base font-semibold text-gray-900 dark:text-white">₹{entry.amount.toLocaleString()}</p>
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
                                  <p className="font-semibold text-gray-700 dark:text-gray-200">Handled by {selectedSalesperson.name}</p>
                                  <p>{entry.handledDepartments.join(', ')}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
