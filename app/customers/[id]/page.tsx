'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { MASTER_DEPARTMENTS } from '@/lib/departments'
import Sidebar from '@/components/Sidebar'

type Visit = {
  id: string
  visitDate: string
  departmentsVisited: string[]
  departmentsNotVisited: string[]
  departmentsCount: number
  totalDepartmentsAvailable: number
  incentiveAmount: string
  salespersons: string[]
  transactions: Array<{
    id: string
    voucherNo: string
    voucherDate: string
    department: string
    counter: string | null
    departmentLabel: string
    salesperson: string
  }>
  crossSellAttempts: Array<{
    id: string
    salespersonName: string
    customerDepartment: string
    suggestedDepartments: string[]
  }>
}

type Call = {
  id: string
  status: string
  duration: number | null
  startedAt: string
  endedAt: string | null
  feedback: {
    outcome: string
    customerMood: string
    rating: number | null
    notes: string | null
    nonVisitedReasons: any
  } | null
}

type Customer = {
  id: string
  customerId: string
  phone: string | null
  visitCount: number
  totalIncentiveAmount: string
  firstVisitDate: string | null
  lastVisitDate: string | null
  visits: Visit[]
  calls: Call[]
  preferredDepartments: string[]
  preferredSalespersons: string[]
}

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomer()
  }, [id])

  const fetchCustomer = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/customers/${id}`)
      if (!response.ok) throw new Error('Failed to fetch customer')
      
      const data = await response.json()
      setCustomer(data.customer)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer')
    } finally {
      setLoading(false)
    }
  }

  const handleCall = async () => {
    // TODO: Implement call initiation
    alert('Call functionality will be implemented with telephony integration')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 dark:text-gray-400">Loading customer profile...</p>
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400">{error || 'Customer not found'}</p>
            <Link href="/customers" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
              Back to Customers
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Customer: {customer.customerId}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Phone: {customer.phone || 'N/A'}
              </p>
            </div>
            <div className="flex gap-4">
              {customer.phone && (
                <button
                  onClick={handleCall}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Call Customer
                </button>
              )}
              <Link
                href="/customers"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
              >
                Back to Customers
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Visits</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{customer.visitCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Incentive</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              ₹{parseFloat(customer.totalIncentiveAmount).toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">First Visit</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-2">
              {customer.firstVisitDate ? new Date(customer.firstVisitDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Visit</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-2">
              {customer.lastVisitDate ? new Date(customer.lastVisitDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Visit History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Visit History</h2>
          </div>
          <div className="p-6 space-y-6">
            {customer.visits.map((visit) => (
              <div key={visit.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {new Date(visit.visitDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Incentive: ₹{parseFloat(visit.incentiveAmount).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {visit.departmentsCount} / {visit.totalDepartmentsAvailable} Departments
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                      ✅ Visited Departments ({visit.departmentsVisited.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {visit.departmentsVisited.map((dept) => (
                        <span
                          key={dept}
                          className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/40 px-3 py-1 text-xs font-medium text-green-800 dark:text-green-200"
                        >
                          {dept}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                      ❌ Not Visited Departments ({visit.departmentsNotVisited.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {visit.departmentsNotVisited.map((dept) => (
                        <span
                          key={dept}
                          className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/40 px-3 py-1 text-xs font-medium text-red-800 dark:text-red-200"
                        >
                          {dept}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {visit.crossSellAttempts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Cross-Selling Attempts:
                    </p>
                    {visit.crossSellAttempts.map((attempt) => (
                      <div key={attempt.id} className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span className="font-medium">{attempt.salespersonName}</span> suggested:{' '}
                        {attempt.suggestedDepartments.join(', ')}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Transactions:</p>
                  <div className="space-y-2">
                    {visit.transactions.map((transaction) => (
                      <div key={transaction.id} className="text-sm text-gray-600 dark:text-gray-400">
                        Voucher #{transaction.voucherNo} - {transaction.departmentLabel} - {transaction.salesperson}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preferred Departments & Salespersons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Preferred Departments
            </h3>
            <div className="flex flex-wrap gap-2">
              {customer.preferredDepartments.length > 0 ? (
                customer.preferredDepartments.map((dept) => (
                  <span
                    key={dept}
                    className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 text-xs font-medium text-blue-800 dark:text-blue-200"
                  >
                    {dept}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Preferred Salespersons
            </h3>
            <div className="flex flex-wrap gap-2">
              {customer.preferredSalespersons.length > 0 ? (
                customer.preferredSalespersons.map((sp) => (
                  <span
                    key={sp}
                    className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/40 px-3 py-1 text-xs font-medium text-purple-800 dark:text-purple-200"
                  >
                    {sp}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Call History */}
        {customer.calls.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Call History</h2>
            </div>
            <div className="p-6 space-y-4">
              {customer.calls.map((call) => (
                <div key={call.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {new Date(call.startedAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Status: {call.status} {call.duration && `• Duration: ${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}`}
                      </p>
                      {call.feedback && (
                        <div className="mt-2 text-sm">
                          <p className="text-gray-600 dark:text-gray-400">
                            Outcome: {call.feedback.outcome} • Mood: {call.feedback.customerMood}
                            {call.feedback.rating && ` • Rating: ${call.feedback.rating}/5`}
                          </p>
                          {call.feedback.notes && (
                            <p className="text-gray-500 dark:text-gray-500 mt-1">{call.feedback.notes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  )
}



