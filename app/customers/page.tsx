'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { parseCustomerData, type CustomerData, type CustomerVisitData } from '@/lib/customerParser'
import { useExcelData } from '@/contexts/ExcelDataContext'

export default function CustomersPage() {
  const router = useRouter()
  const { excelBuffer, fileName } = useExcelData()
  const [customerData, setCustomerData] = useState<{ customers: CustomerData[], allDepartments: string[] } | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (excelBuffer) {
      setIsParsing(true)
      setError(null)

      try {
        const parsed = parseCustomerData(excelBuffer)
        setCustomerData({
          customers: parsed.customers,
          allDepartments: parsed.allDepartments,
        })
      } catch (err) {
        console.error(err)
        setCustomerData(null)
        setError(err instanceof Error ? err.message : 'Failed to parse Excel file.')
      } finally {
        setIsParsing(false)
      }
    } else {
      setCustomerData(null)
      setError(null)
    }
  }, [excelBuffer])

  // Sort customers by total visits (highest to lowest)
  const sortedCustomers = useMemo(() => {
    if (!customerData) return []
    return [...customerData.customers].sort((a, b) => b.totalVisits - a.totalVisits)
  }, [customerData])

  const handleCustomerClick = (customerId: string) => {
    router.push(`/customers/${encodeURIComponent(customerId)}`)
  }

  const getAverageDepartmentsVisited = (customer: CustomerData): number => {
    if (customer.visits.length === 0) return 0
    const total = customer.visits.reduce((sum, visit) => sum + visit.visitedCount, 0)
    return Math.round((total / customer.visits.length) * 10) / 10
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Details</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              View customer department visits analysis per date. Data from uploaded Excel file.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!excelBuffer && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-8">
            <div className="p-8">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  No Excel File Uploaded
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Please upload an Excel file from the <strong>Incentive</strong> tab first.
                </p>
              </div>
            </div>
          </div>
        )}

        {fileName && excelBuffer && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-6">
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">File:</span> {fileName}
              </p>
            </div>
          </div>
        )}

        {isParsing && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center">
              <p className="text-sm text-blue-600 dark:text-blue-400">Parsing customer data…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-red-200 dark:border-red-700 p-8">
            <div className="text-center">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {customerData && sortedCustomers.length > 0 && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-6 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Analysis</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Customers sorted by visit frequency (most visits first). Click on a card to see detailed visit breakdown.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="font-medium text-blue-900 dark:text-blue-200">{sortedCustomers.length}</span>
                    <span className="text-blue-700 dark:text-blue-300 ml-1">Customers</span>
                  </div>
                  <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="font-medium text-green-900 dark:text-green-200">{customerData.allDepartments.length}</span>
                    <span className="text-green-700 dark:text-green-300 ml-1">Departments</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCustomers.map((customer) => {
                const avgDepartments = getAverageDepartmentsVisited(customer)
                const latestVisit = customer.visits[0] // Already sorted by date (newest first)
                const latestVisitPercentage = latestVisit
                  ? ((latestVisit.visitedCount / latestVisit.totalDepartments) * 100).toFixed(0)
                  : '0'

                return (
                  <div
                    key={customer.customerId}
                    onClick={() => handleCustomerClick(customer.customerId)}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all cursor-pointer"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <svg
                              className="w-5 h-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                {customer.customerName || customer.customerId}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {customer.customerName ? customer.customerId : 'No name available'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4 text-blue-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {customer.totalVisits}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">visit{customer.totalVisits !== 1 ? 's' : ''}</span>
                            </div>
                            {latestVisit && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Latest:</span>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {latestVisitPercentage}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>

                      {/* Quick Stats */}
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Avg. Departments/Visit</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{avgDepartments}</span>
                        </div>
                        {latestVisit && (
                          <div className="flex items-center justify-between text-xs mt-2">
                            <span className="text-gray-500 dark:text-gray-400">Last Visit</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {latestVisit.displayDate || latestVisit.dateKey}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {customerData && sortedCustomers.length === 0 && excelBuffer && !isParsing && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No customer data found in the uploaded file.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
