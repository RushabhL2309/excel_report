'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { parseCustomerData, type CustomerData } from '@/lib/customerParser'
import { useExcelData } from '@/contexts/ExcelDataContext'
import { useCallHistory } from '@/contexts/CallHistoryContext'

export default function CallingPage() {
  const router = useRouter()
  const { excelBuffer } = useExcelData()
  const { completedCalls, isCustomerCalled } = useCallHistory()
  const [customerData, setCustomerData] = useState<{ customers: CustomerData[], allDepartments: string[] } | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')

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

  const sortedCustomers = useMemo(() => {
    if (!customerData) return []
    return [...customerData.customers].sort((a, b) => b.totalVisits - a.totalVisits)
  }, [customerData])

  const pendingCustomers = useMemo(() => {
    return sortedCustomers.filter(c => !isCustomerCalled(c.customerId))
  }, [sortedCustomers, isCustomerCalled])

  const handleCallClick = (customerId: string) => {
    // Navigate to feedback page with customer ID
    router.push(`/calling/feedback?customerId=${encodeURIComponent(customerId)}`)
  }

  const getAverageDepartmentsVisited = (customer: CustomerData): number => {
    if (customer.visits.length === 0) return 0
    const total = customer.visits.reduce((sum, visit) => sum + visit.visitedCount, 0)
    return Math.round((total / customer.visits.length) * 10) / 10
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calling</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Manage your call list and review feedback here.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit self-start">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'pending'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                Pending Calls ({pendingCustomers.length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'completed'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                Completed Calls ({completedCalls.length})
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-opacity duration-300 ease-in-out">
        {!excelBuffer && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8">
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
                No Excel Data Available
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Please upload an Excel file from the Incentive tab first to see the customer list.
              </p>
            </div>
          </div>
        )}

        {isParsing && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-blue-600 dark:text-blue-400">Loading customers...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300 mb-6">
            {error}
          </div>
        )}

        {/* Tab Content */}
        {customerData && !isParsing && (
          <div>
            {activeTab === 'pending' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-left-4 fade-in duration-300">
                {pendingCustomers.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-lg font-medium">No pending calls!</p>
                    <p className="text-sm">Great job clearing the list.</p>
                  </div>
                ) : (
                  pendingCustomers.map((customer) => {
                    const avgDepts = getAverageDepartmentsVisited(customer)
                    const latestVisit = customer.visits[0]
                    return (
                      <div
                        key={customer.customerId}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 dark:text-white leading-none">
                                  {customer.customerId}
                                </h3>
                                {customer.customerName && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate max-w-[150px]">
                                    {customer.customerName}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {customer.totalVisits} total visits
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleCallClick(customer.customerId)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              Call
                            </button>
                          </div>
                          <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500 dark:text-gray-400">Avg Departments</span>
                              <span className="font-semibold text-gray-700 dark:text-gray-200">{avgDepts}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500 dark:text-gray-400">Last Visit</span>
                              <span className="font-medium text-gray-700 dark:text-gray-200">
                                {latestVisit?.displayDate || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-4 fade-in duration-300">
                {completedCalls.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg font-medium">No calls completed yet.</p>
                    <p className="text-sm">Start calling from adding the pending tab!</p>
                  </div>
                ) : (
                  completedCalls.map((call, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                              {call.customerId}
                            </h3>
                            {call.customerName && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                                {call.customerName}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${call.status === 'Connected'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                                  }`}
                              >
                                {call.status}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Duration: <span className="font-semibold text-gray-700 dark:text-gray-200">{call.duration}</span>
                              </span>
                            </div>
                          </div>
                          <button
                            className="p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors shadow-sm"
                            title="Play Recording"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </div>
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Started:</span>
                            <span className="font-mono">{new Date(call.startTime).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Ended:</span>
                            <span className="font-mono">{new Date(call.endTime).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
