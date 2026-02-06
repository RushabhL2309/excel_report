'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { parseCustomerData, type CustomerData, type CustomerVisitData } from '@/lib/customerParser'
import { useExcelData } from '@/contexts/ExcelDataContext'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { excelBuffer, fileName } = useExcelData()
  const customerId = params?.id ? decodeURIComponent(params.id as string) : null

  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [allDepartments, setAllDepartments] = useState<string[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (excelBuffer && customerId) {
      setIsParsing(true)
      setError(null)

      try {
        const parsed = parseCustomerData(excelBuffer)
        const customer = parsed.customers.find(c => c.customerId === customerId)
        
        if (customer) {
          setCustomerData(customer)
          setAllDepartments(parsed.allDepartments)
        } else {
          setError(`Customer with ID "${customerId}" not found.`)
        }
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Failed to parse Excel file.')
      } finally {
        setIsParsing(false)
      }
    } else if (!excelBuffer) {
      setError('No Excel file data available. Please upload a file from the Incentive tab.')
    }
  }, [excelBuffer, customerId])

  const toggleVisit = (visitKey: string) => {
    const newExpanded = new Set(expandedVisits)
    if (newExpanded.has(visitKey)) {
      newExpanded.delete(visitKey)
    } else {
      newExpanded.add(visitKey)
    }
    setExpandedVisits(newExpanded)
  }

  const getVisitKey = (visit: CustomerVisitData) => {
    return visit.dateKey
  }

  const getAverageDepartmentsVisited = (customer: CustomerData): number => {
    if (customer.visits.length === 0) return 0
    const total = customer.visits.reduce((sum, visit) => sum + visit.visitedCount, 0)
    return Math.round((total / customer.visits.length) * 10) / 10
  }

  const getTotalDepartmentsVisited = (customer: CustomerData): number => {
    const uniqueDepartments = new Set<string>()
    customer.visits.forEach(visit => {
      visit.departmentsVisited.forEach(dept => uniqueDepartments.add(dept))
    })
    return uniqueDepartments.size
  }

  const getVisitPercentage = (customer: CustomerData): number => {
    if (customer.visits.length === 0) return 0
    const totalPercentage = customer.visits.reduce((sum, visit) => {
      const percentage = visit.totalDepartments > 0
        ? (visit.visitedCount / visit.totalDepartments) * 100
        : 0
      return sum + percentage
    }, 0)
    return Math.round((totalPercentage / customer.visits.length) * 10) / 10
  }

  if (!customerId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-red-200 dark:border-red-700 p-8">
            <p className="text-sm text-red-600 dark:text-red-400">Invalid customer ID</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header Section */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
              aria-label="Go back"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Profile</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Comprehensive visit analysis and department insights
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isParsing && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading customer data…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-red-200 dark:border-red-700 p-8">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={() => router.push('/customers')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Customer List
              </button>
            </div>
          </div>
        )}

        {customerData && !error && (
          <div className="space-y-6">
            {/* Customer Overview Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-6 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-4 ring-white/20">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{customerData.customerId}</h2>
                      <p className="text-blue-100 text-sm mt-1">Customer Identification</p>
                    </div>
                  </div>
                  {fileName && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                      <p className="text-xs text-blue-100 font-medium mb-1">Source File</p>
                      <p className="text-sm text-white font-semibold truncate max-w-xs">{fileName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200 dark:border-blue-700/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{customerData.totalVisits}</p>
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Visits</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl p-5 border border-green-200 dark:border-green-700/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">{getAverageDepartmentsVisited(customerData)}</p>
                        <p className="text-xs font-medium text-green-700 dark:text-green-300">Avg. Departments</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl p-5 border border-purple-200 dark:border-purple-700/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{getTotalDepartmentsVisited(customerData)}</p>
                        <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Unique Visited</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-xl p-5 border border-orange-200 dark:border-orange-700/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{allDepartments.length}</p>
                        <p className="text-xs font-medium text-orange-700 dark:text-orange-300">Total Available</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overall Performance */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Visit Performance</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Average department coverage across all visits
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{getVisitPercentage(customerData)}%</p>
                      <div className="mt-2 w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${getVisitPercentage(customerData)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visit History Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Visit History</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Detailed breakdown of all customer visits with department analysis
                    </p>
                  </div>
                  <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {customerData.visits.length} {customerData.visits.length === 1 ? 'Visit' : 'Visits'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {customerData.visits.length === 0 ? (
                  <div className="p-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No visits recorded for this customer.</p>
                  </div>
                ) : (
                  customerData.visits.map((visit, index) => {
                    const visitKey = getVisitKey(visit)
                    const isVisitExpanded = expandedVisits.has(visitKey)
                    const visitPercentage = visit.totalDepartments > 0
                      ? ((visit.visitedCount / visit.totalDepartments) * 100).toFixed(1)
                      : '0'

                    return (
                      <div
                        key={visitKey}
                        className={`p-6 transition-colors ${
                          isVisitExpanded
                            ? 'bg-blue-50/50 dark:bg-blue-900/10'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        }`}
                      >
                        <button
                          onClick={() => toggleVisit(visitKey)}
                          className="w-full flex items-center justify-between text-left group"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-4 flex-wrap mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">#{index + 1}</span>
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {visit.displayDate || visit.dateKey}
                                  </h4>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Visit Date</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                                  <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                                    {visit.visitedCount}/{visit.totalDepartments}
                                  </span>
                                  <span className="text-xs text-blue-700 dark:text-blue-300 ml-1">departments</span>
                                </div>
                                <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {visitPercentage}%
                                  </span>
                                </div>
                                {visit.voucherNos.length > 0 && (
                                  <div className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                      {visit.voucherNos.length} voucher{visit.voucherNos.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 ml-13">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {visit.departmentsVisited.length} visited
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                {visit.departmentsNotVisited.length} not visited
                              </span>
                            </div>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-all flex-shrink-0 ml-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 ${
                              isVisitExpanded ? 'transform rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {isVisitExpanded && (
                          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6 animate-in slide-in-from-top-2 duration-200">
                            {visit.voucherNos.length > 0 && (
                              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-3">
                                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                                    Voucher Numbers ({visit.voucherNos.length})
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {visit.voucherNos.map((voucherNo) => (
                                    <span
                                      key={voucherNo}
                                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 shadow-sm"
                                    >
                                      {voucherNo}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 rounded-xl p-6 border border-green-200 dark:border-green-700/50">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="p-2 bg-green-500 rounded-lg">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-green-900 dark:text-green-100">
                                      Visited Departments
                                    </p>
                                    <p className="text-xs text-green-700 dark:text-green-300">
                                      {visit.visitedCount} of {visit.totalDepartments} departments
                                    </p>
                                  </div>
                                </div>
                                {visit.departmentsVisited.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {visit.departmentsVisited.map((dept) => (
                                      <span
                                        key={dept}
                                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-600 shadow-sm"
                                      >
                                        {dept}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No departments visited on this date</p>
                                )}
                              </div>

                              <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 rounded-xl p-6 border border-red-200 dark:border-red-700/50">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="p-2 bg-red-500 rounded-lg">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-red-900 dark:text-red-100">
                                      Not Visited Departments
                                    </p>
                                    <p className="text-xs text-red-700 dark:text-red-300">
                                      {visit.departmentsNotVisited.length} departments
                                    </p>
                                  </div>
                                </div>
                                {visit.departmentsNotVisited.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {visit.departmentsNotVisited.map((dept) => (
                                      <span
                                        key={dept}
                                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-600 shadow-sm"
                                      >
                                        {dept}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">All departments visited on this date</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
