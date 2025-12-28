'use client'

import { useState, useEffect } from 'react'
import { MASTER_DEPARTMENTS } from '@/lib/departments'
import type { NonVisitReason } from '@/lib/types'

type CallFeedbackFormProps = {
  callId: string
  customerId: string
  customerPhone: string | null
  lastVisitDate: string | null
  lastVisitDepartmentsVisited: string[]
  lastVisitDepartmentsNotVisited: string[]
  onSubmit: (feedback: any) => Promise<void>
  onCancel: () => void
}

export default function CallFeedbackForm({
  callId,
  customerId,
  lastVisitDepartmentsVisited,
  lastVisitDepartmentsNotVisited,
  onSubmit,
  onCancel,
}: CallFeedbackFormProps) {
  const [outcome, setOutcome] = useState('')
  const [customerMood, setCustomerMood] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [requiresFollowUp, setRequiresFollowUp] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpReason, setFollowUpReason] = useState('')
  const [nonVisitedReasons, setNonVisitedReasons] = useState<Record<string, NonVisitReason>>({})
  const [submitting, setSubmitting] = useState(false)

  // Initialize non-visited reasons for each department
  const initializeReasons = () => {
    const reasons: Record<string, NonVisitReason> = {}
    lastVisitDepartmentsNotVisited.forEach((dept) => {
      reasons[dept] = {
        department: dept,
        reason: 'didnt_know',
        reasonDetails: '',
        salespersonMentioned: false,
      }
    })
    setNonVisitedReasons(reasons)
  }

  useEffect(() => {
    initializeReasons()
  }, [])

  const handleReasonChange = (department: string, field: keyof NonVisitReason, value: any) => {
    setNonVisitedReasons((prev) => ({
      ...prev,
      [department]: {
        ...prev[department],
        [field]: value,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const feedbackData = {
        callId,
        customerId,
        // submittedBy will be automatically set by API from call's initiatedBy
        outcome,
        customerMood,
        rating,
        notes,
        requiresFollowUp,
        followUpDate: requiresFollowUp ? followUpDate : null,
        followUpReason: requiresFollowUp ? followUpReason : null,
        nonVisitedDepartmentsDiscussed: lastVisitDepartmentsNotVisited,
        nonVisitedReasons: Object.values(nonVisitedReasons),
      }

      await onSubmit(feedbackData)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Call Feedback</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Submit feedback about the call and customer visit analysis
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Standard Feedback Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Call Outcome *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {['SUCCESSFUL', 'NO_ANSWER', 'BUSY', 'INVALID_NUMBER', 'OTHER'].map((opt) => (
                <label key={opt} className="flex items-center">
                  <input
                    type="radio"
                    name="outcome"
                    value={opt}
                    checked={outcome === opt}
                    onChange={(e) => setOutcome(e.target.value)}
                    className="mr-2"
                    required
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{opt.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer Mood *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {['HAPPY', 'NEUTRAL', 'UNHAPPY', 'ANGRY', 'UNKNOWN'].map((mood) => (
                <label key={mood} className="flex items-center">
                  <input
                    type="radio"
                    name="mood"
                    value={mood}
                    checked={customerMood === mood}
                    onChange={(e) => setCustomerMood(e.target.value)}
                    className="mr-2"
                    required
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{mood}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rating (1-5)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-2xl ${
                    rating && star <= rating
                      ? 'text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              rows={4}
            />
          </div>

          {/* Department Visit Analysis */}
          {lastVisitDepartmentsNotVisited.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Department Visit Analysis
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Customer visited: {lastVisitDepartmentsVisited.length} departments
                <br />
                Customer did NOT visit: {lastVisitDepartmentsNotVisited.length} departments
              </p>

              <div className="space-y-4">
                {lastVisitDepartmentsNotVisited.map((dept) => {
                  const reason = nonVisitedReasons[dept] || {
                    department: dept,
                    reason: 'didnt_know',
                    reasonDetails: '',
                    salespersonMentioned: false,
                  }

                  return (
                    <div key={dept} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        ❌ {dept}
                      </h4>

                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Why didn't customer visit this department?
                        </label>
                        <select
                          value={reason.reason}
                          onChange={(e) =>
                            handleReasonChange(dept, 'reason', e.target.value)
                          }
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                        >
                          <option value="didnt_know">Didn't know about it</option>
                          <option value="not_interested">Knew but not interested</option>
                          <option value="no_time">No time</option>
                          <option value="not_informed_by_salesperson">Salesperson didn't inform</option>
                          <option value="budget_constraint">Budget constraint</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Details (optional)
                        </label>
                        <textarea
                          value={reason.reasonDetails || ''}
                          onChange={(e) =>
                            handleReasonChange(dept, 'reasonDetails', e.target.value)
                          }
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                          rows={2}
                          placeholder="Additional notes..."
                        />
                      </div>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reason.salespersonMentioned || false}
                          onChange={(e) =>
                            handleReasonChange(dept, 'salespersonMentioned', e.target.checked)
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Did you (salesperson) mention/tell customer about this department during visit?
                        </span>
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Follow-up */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={requiresFollowUp}
                onChange={(e) => setRequiresFollowUp(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Requires Follow-up
              </span>
            </label>

            {requiresFollowUp && (
              <div className="space-y-4 pl-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                    required={requiresFollowUp}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Follow-up Reason
                  </label>
                  <textarea
                    value={followUpReason}
                    onChange={(e) => setFollowUpReason(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                    rows={3}
                    required={requiresFollowUp}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !outcome || !customerMood}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}



