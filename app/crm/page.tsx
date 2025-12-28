'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import CallFeedbackForm from '@/components/CallFeedbackForm'

type Customer = {
  id: string
  customerId: string
  phone: string | null
  visitCount: number
  totalIncentiveAmount: string
  firstVisitDate: string | null
  lastVisitDate: string | null
  lastVisit: {
    id: string
    visitDate: string
    departmentsVisited: string[]
    departmentsNotVisited: string[]
    departmentsCount: number
    totalDepartmentsAvailable: number
  } | null
  callCount: number
  latestFeedback: {
    outcome: string
    customerMood: string
    rating: number | null
    notes: string | null
    createdAt: string
    visitId: string | null
  } | null
  hasBeenCalledForLatestVisit: boolean
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
  } | null
}

type TabType = 'to-call' | 'completed'

export default function CRMPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [completedCustomers, setCompletedCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [activeCall, setActiveCall] = useState<Call | null>(null)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [calling, setCalling] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [currentTab, setCurrentTab] = useState<TabType>('to-call')
  const itemsPerPage = 10

  useEffect(() => {
    fetchCustomers()
  }, [])

  // Determine which customer list to show based on active tab
  const activeCustomers = currentTab === 'to-call' ? customers : completedCustomers
  
  // Pagination calculations
  const totalPages = Math.ceil(activeCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCustomers = activeCustomers.slice(startIndex, endIndex)
  const showingFrom = activeCustomers.length > 0 ? startIndex + 1 : 0
  const showingTo = Math.min(endIndex, activeCustomers.length)

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/customers')
      if (!response.ok) throw new Error('Failed to fetch customers')
      
      const data = await response.json()
      const customersList = data.customers || []
      
      // Fetch latest feedback and check if latest visit has been called
      const customersWithFeedback = await Promise.all(
        customersList.map(async (customer: any) => {
          try {
            // Fetch feedbacks to check if latest visit has been called
            const feedbackResponse = await fetch(`/api/feedback?customerId=${customer.id}`)
            let latestFeedback = null
            let hasBeenCalledForLatestVisit = false
            
            if (feedbackResponse.ok) {
              const feedbackData = await feedbackResponse.json()
              const feedbacks = feedbackData.feedbacks || []
              if (feedbacks.length > 0) {
                const latest = feedbacks[0] // Already sorted by createdAt desc
                latestFeedback = {
                  outcome: latest.outcome,
                  customerMood: latest.customerMood,
                  rating: latest.rating,
                  notes: latest.notes,
                  createdAt: latest.createdAt,
                  visitId: latest.visitId || null,
                }
                
                // Check if latest visit has been called
                if (customer.lastVisit && customer.lastVisit.id) {
                  // Check if there's feedback linked to this visit
                  const feedbackForLatestVisit = feedbacks.find((f: any) => f.visitId === customer.lastVisit.id)
                  hasBeenCalledForLatestVisit = !!feedbackForLatestVisit
                }
              }
            }
            
            return {
              ...customer,
              latestFeedback,
              hasBeenCalledForLatestVisit,
            } as Customer
          } catch (err) {
            return {
              ...customer,
              latestFeedback: null,
              hasBeenCalledForLatestVisit: false,
            } as Customer
          }
        })
      )
      
      // Separate customers into "to call" and "completed" lists
      const customersToCall = customersWithFeedback.filter(
        (customer: Customer) => !customer.hasBeenCalledForLatestVisit
      )
      
      const customersCompleted = customersWithFeedback.filter(
        (customer: Customer) => customer.hasBeenCalledForLatestVisit
      )
      
      setCustomers(customersToCall)
      setCompletedCustomers(customersCompleted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const handleInitiateCall = async (customer: Customer) => {
    if (!customer.phone) {
      alert('Customer phone number is not available')
      return
    }

    setCalling(true)
    setSelectedCustomer(customer)

    try {
      // TODO: Replace with actual user ID from auth context once authentication is implemented
      // For now, API will create/use a default system user
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          visitId: customer.lastVisit?.id || null, // Link call to specific visit
          // salespersonId is optional - API will create/use default system user if not provided
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initiate call')
      }

      const data = await response.json()
      
      // Create a call object for tracking
      const call: Call = {
        id: data.callId,
        status: data.status,
        duration: null,
        startedAt: new Date().toISOString(),
        endedAt: null,
        feedback: null,
      }

      setActiveCall(call)
      
      // Show feedback form immediately while call is in progress
      setShowFeedbackForm(true)
      
      // Show success message - call is now active
      // In production, telephony provider will handle the actual call connection
      // For now, this simulates the call flow
      console.log('Call initiated:', { callId: data.callId, customerId: customer.id })
    } catch (err) {
      console.error('Error initiating call:', err)
      alert(err instanceof Error ? err.message : 'Failed to initiate call')
    } finally {
      setCalling(false)
    }
  }

  const handleEndCall = () => {
    // Call ended - feedback form should already be visible
    // User can continue filling feedback or submit it
    setActiveCall(null)
  }

  const handleSubmitFeedback = async (feedbackData: any) => {
    if (!selectedCustomer) return

    // Add visitId to feedback data if available
    const feedbackPayload = {
      ...feedbackData,
      visitId: selectedCustomer.lastVisit?.id || null,
      callId: activeCall?.id || feedbackData.callId, // Use active call ID or from feedbackData
    }

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit feedback')
      }

      alert('Feedback submitted successfully! Customer moved to "Done Calling" group.')
      setShowFeedbackForm(false)
      setActiveCall(null)
      setSelectedCustomer(null)
      
      // Refresh customers list - customer will be filtered out as they've been called for latest visit
      fetchCustomers()
    } catch (err) {
      console.error('Error submitting feedback:', err)
      alert(err instanceof Error ? err.message : 'Failed to submit feedback')
    }
  }

  const handleCancelFeedback = () => {
    setShowFeedbackForm(false)
    setActiveCall(null)
    setSelectedCustomer(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 dark:text-gray-400">Loading customers...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
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
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM - Customer Calls</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Call customers, collect feedback, and track cross-selling performance
            </p>
          </div>
          
          {/* Tabs */}
          <div className="px-6 border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => {
                  setCurrentTab('to-call')
                  setCurrentPage(1)
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'to-call'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                To Call
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {customers.length}
                </span>
              </button>
              <button
                onClick={() => {
                  setCurrentTab('completed')
                  setCurrentPage(1)
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'completed'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Completed Calls
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {completedCustomers.length}
                </span>
              </button>
            </nav>
          </div>
        </header>

        <main className="flex-1 px-6 py-8">
          {/* Active Call Banner */}
          {activeCall && selectedCustomer && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-600 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-300 flex items-center gap-2">
                    <span className="text-2xl">📞</span>
                    Call in Progress: {selectedCustomer.customerId}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    Status: {activeCall.status} • Started: {new Date(activeCall.startedAt).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-2 italic">
                    💡 Fill the feedback form below while on the call. Click "End Call" when done.
                  </p>
                </div>
                <button
                  onClick={handleEndCall}
                  className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium shadow-lg"
                >
                  End Call
                </button>
              </div>
            </div>
          )}

          {/* Customers List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {currentTab === 'to-call' 
                  ? `Customers to Call (${customers.length})`
                  : `Completed Calls (${completedCustomers.length})`
                }
              </h2>
            </div>
            <div className="p-6">
              {activeCustomers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  {currentTab === 'to-call'
                    ? 'No customers to call. All customers have been contacted for their latest visit.'
                    : 'No completed calls yet. Completed calls with feedback will appear here.'
                  }
                </p>
              ) : (
                <div className="space-y-4">
                  {currentCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {customer.customerId}
                            </h3>
                            {customer.phone && (
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                📱 {customer.phone}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Visits:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {customer.visitCount}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Incentive:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                ₹{parseFloat(customer.totalIncentiveAmount).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Calls:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {customer.callCount}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Last Visit:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {customer.lastVisitDate
                                  ? new Date(customer.lastVisitDate).toLocaleDateString()
                                  : 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* Latest Feedback */}
                          {customer.latestFeedback && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                                📝 Latest Feedback ({new Date(customer.latestFeedback.createdAt).toLocaleDateString()}):
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="text-blue-700 dark:text-blue-400">Outcome:</span>
                                  <span className="ml-1 font-medium text-blue-900 dark:text-blue-200">
                                    {customer.latestFeedback.outcome}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-blue-700 dark:text-blue-400">Mood:</span>
                                  <span className="ml-1 font-medium text-blue-900 dark:text-blue-200">
                                    {customer.latestFeedback.customerMood}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-blue-700 dark:text-blue-400">Rating:</span>
                                  <span className="ml-1 font-medium text-blue-900 dark:text-blue-200">
                                    {customer.latestFeedback.rating ? (
                                      <span className="flex items-center">
                                        {'★'.repeat(customer.latestFeedback.rating)}
                                        {'☆'.repeat(5 - customer.latestFeedback.rating)}
                                      </span>
                                    ) : (
                                      'N/A'
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-blue-700 dark:text-blue-400">Notes:</span>
                                  <span className="ml-1 font-medium text-blue-900 dark:text-blue-200">
                                    {customer.latestFeedback.notes ? (
                                      <span className="truncate block max-w-[150px]" title={customer.latestFeedback.notes}>
                                        {customer.latestFeedback.notes}
                                      </span>
                                    ) : (
                                      'None'
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Department Visit Analysis */}
                          {customer.lastVisit && (
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Last Visit Department Analysis:
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs text-green-700 dark:text-green-400 mb-1">
                                    ✅ Visited ({customer.lastVisit.departmentsVisited.length}):
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {customer.lastVisit.departmentsVisited.slice(0, 3).map((dept) => (
                                      <span
                                        key={dept}
                                        className="inline-block bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs"
                                      >
                                        {dept}
                                      </span>
                                    ))}
                                    {customer.lastVisit.departmentsVisited.length > 3 && (
                                      <span className="text-xs text-gray-500">
                                        +{customer.lastVisit.departmentsVisited.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-red-700 dark:text-red-400 mb-1">
                                    ❌ Not Visited ({customer.lastVisit.departmentsNotVisited.length}):
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {customer.lastVisit.departmentsNotVisited.slice(0, 3).map((dept) => (
                                      <span
                                        key={dept}
                                        className="inline-block bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs"
                                      >
                                        {dept}
                                      </span>
                                    ))}
                                    {customer.lastVisit.departmentsNotVisited.length > 3 && (
                                      <span className="text-xs text-gray-500">
                                        +{customer.lastVisit.departmentsNotVisited.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                <strong>Cross-Selling Opportunity:</strong> Ask customer about{' '}
                                {customer.lastVisit.departmentsNotVisited.slice(0, 2).join(', ')}
                                {customer.lastVisit.departmentsNotVisited.length > 2 && ' and more'}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="ml-4 flex flex-col gap-2">
                          {currentTab === 'to-call' ? (
                            customer.phone ? (
                              <>
                                {activeCall && activeCall.id && selectedCustomer?.id === customer.id ? (
                                  <button
                                    onClick={handleEndCall}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium whitespace-nowrap"
                                  >
                                    End Call
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleInitiateCall(customer)}
                                    disabled={calling || (activeCall !== null)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                                  >
                                    {calling ? 'Calling...' : '📞 Call'}
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-md text-sm text-center whitespace-nowrap">
                                No Phone
                              </span>
                            )
                          ) : (
                            <span className="px-4 py-2 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-md text-sm text-center whitespace-nowrap font-medium">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {showingFrom} to {showingTo} of {activeCustomers.length} customers
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                currentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="px-2 text-gray-500">...</span>
                        }
                        return null
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Feedback Form Modal - Show during call (opens immediately when call starts) */}
      {showFeedbackForm && selectedCustomer && (
        <CallFeedbackForm
          callId={activeCall?.id || 'pending'}
          customerId={selectedCustomer.id}
          customerPhone={selectedCustomer.phone}
          lastVisitDate={selectedCustomer.lastVisitDate}
          lastVisitDepartmentsVisited={selectedCustomer.lastVisit?.departmentsVisited || []}
          lastVisitDepartmentsNotVisited={selectedCustomer.lastVisit?.departmentsNotVisited || []}
          onSubmit={handleSubmitFeedback}
          onCancel={handleCancelFeedback}
        />
      )}
    </div>
  )
}

