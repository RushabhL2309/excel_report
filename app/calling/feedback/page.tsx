'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCallHistory } from '@/contexts/CallHistoryContext'
import { useExcelData } from '@/contexts/ExcelDataContext'
import { parseCustomerData } from '@/lib/customerParser'

const CALL_STATUS_OPTIONS = [
    'CALL BACK',
    'Connected',
    'Not Connected',
    'Ringing',
    'busy',
    'Wrong Number'
] as const

const RATING_OPTIONS = [
    'very poor',
    'poor',
    'average',
    'good',
    'excellent'
] as const

type CallStatus = typeof CALL_STATUS_OPTIONS[number]
type Rating = typeof RATING_OPTIONS[number]

function FeedbackForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const customerId = searchParams.get('customerId')
    const { excelBuffer } = useExcelData()
    const [customerName, setCustomerName] = useState<string | null>(null)

    // Fetch customer name from Excel data
    useEffect(() => {
        if (excelBuffer && customerId) {
            try {
                const parsed = parseCustomerData(excelBuffer)
                const customer = parsed.customers.find(c => c.customerId === customerId)
                if (customer) {
                    setCustomerName(customer.customerName)
                }
            } catch (err) {
                console.error('Failed to parse customer data:', err)
            }
        }
    }, [excelBuffer, customerId])

    const [form, setForm] = useState({
        callStatus: 'CALL BACK' as CallStatus,
        rating: null as Rating | null,
        likedStore: null as boolean | null,
        staffHelpful: null as boolean | null,
        satisfiedService: null as boolean | null,
        revisitStore: null as boolean | null,
        crossSellAsked: null as boolean | null,
        improvementneeded: null as boolean | null,
        improvementComments: '',
        requiresFollowUp: true, // Default to true for CALL BACK
        followUpDate: '',
    })

    // Auto-update Follow Up requirement based on status
    useEffect(() => {
        const status = form.callStatus
        if (['Ringing', 'busy', 'CALL BACK', 'Not Connected'].includes(status)) {
            setForm(prev => ({ ...prev, requiresFollowUp: true }))
        } else if (status === 'Wrong Number') {
            setForm(prev => ({ ...prev, requiresFollowUp: false }))
        } else if (status === 'Connected') {
            setForm(prev => ({ ...prev, requiresFollowUp: false }))
        }
    }, [form.callStatus])

    const { addCompletedCall } = useCallHistory()
    const [startTime] = useState(new Date().toISOString())

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const endTime = new Date().toISOString()
        const start = new Date(startTime)
        const end = new Date(endTime)
        const diffMs = end.getTime() - start.getTime()
        const minutes = Math.floor(diffMs / 60000)
        const seconds = Math.floor((diffMs % 60000) / 1000)
        const duration = `${minutes}m ${seconds}s`

        // Derive final values for submission
        const finalOutcome = form.revisitStore === true ? 'Interested' : 'Not Interested'
        const isCrossSell = form.crossSellAsked === true ? 'Yes' : 'No'

        // Save to context
        if (customerId) {
            addCompletedCall({
                customerId,
                customerName,
                startTime,
                endTime,
                duration,
                status: form.callStatus
            })
        }

        const submissionData = {
            ...form,
            finalOutcome,
            isCrossSell,
            startTime,
            endTime,
            duration
        }

        console.log('Form submitted:', submissionData)
        alert('Feedback submitted successfully!')
        router.push('/calling')
    }

    if (!customerId) {
        return (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                    <p className="text-red-500 font-medium mb-4">No customer ID provided.</p>
                    <button
                        onClick={() => router.push('/calling')}
                        className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                    >
                        Back to Calling List
                    </button>
                </div>
            </div>
        )
    }

    const isConnected = form.callStatus === 'Connected'

    // Derived Values for Display
    const derivedFinalOutcome = form.revisitStore === true ? 'Interested' : (form.revisitStore === false ? 'Not Interested' : '-')
    const derivedCrossSell = form.crossSellAsked === true ? 'Yes' : (form.crossSellAsked === false ? 'No' : '-')

    const YesNoQuestion = ({
        label,
        value,
        onChange
    }: {
        label: string,
        value: boolean | null,
        onChange: (val: boolean) => void
    }) => (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {label}
            </label>
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={() => onChange(true)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${value === true
                        ? 'bg-green-600 text-white shadow-md shadow-green-500/20'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                >
                    Yes
                </button>
                <button
                    type="button"
                    onClick={() => onChange(false)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${value === false
                        ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                >
                    No
                </button>
            </div>
        </div>
    )

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 px-6 py-5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <div>
                            <span className="block text-blue-100 text-xs font-medium uppercase tracking-wider">Feedback Form</span>
                            <span className="block">Customer: {customerId}</span>
                            {customerName && (
                                <span className="block text-sm text-blue-100 mt-0.5">{customerName}</span>
                            )}
                        </div>
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Call Status */}
                    <section>
                        <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                            Call Status
                        </label>
                        <div className="relative">
                            <select
                                value={form.callStatus}
                                onChange={(e) => setForm({ ...form, callStatus: e.target.value as CallStatus })}
                                className="w-full p-3 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                            >
                                {CALL_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </section>

                    {/* Conditional Questions */}
                    {isConnected && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-6"></div>

                            <YesNoQuestion
                                label="1. Did you like our store & collection?"
                                value={form.likedStore}
                                onChange={(val) => setForm({ ...form, likedStore: val })}
                            />

                            <YesNoQuestion
                                label="2. Was our staff helpful, polite & knowledgeable?"
                                value={form.staffHelpful}
                                onChange={(val) => setForm({ ...form, staffHelpful: val })}
                            />

                            <YesNoQuestion
                                label="3. Are you satisfied with the service you received?"
                                value={form.satisfiedService}
                                onChange={(val) => setForm({ ...form, satisfiedService: val })}
                            />

                            <YesNoQuestion
                                label="4. Would you like to revisit our store?"
                                value={form.revisitStore}
                                onChange={(val) => setForm({ ...form, revisitStore: val })}
                            />

                            <YesNoQuestion
                                label="5. Did our salesman ask about women's / men's collection?"
                                value={form.crossSellAsked}
                                onChange={(val) => setForm({ ...form, crossSellAsked: val })}
                            />

                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                                    6. Is there anything specific you would like us to improve?
                                </label>
                                <div className="flex gap-4 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, improvementneeded: true })}
                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${form.improvementneeded === true
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, improvementneeded: false, improvementComments: '' })}
                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${form.improvementneeded === false
                                            ? 'bg-gray-600 text-white shadow-md shadow-gray-500/20'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        No
                                    </button>
                                </div>

                                {form.improvementneeded && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                        <textarea
                                            placeholder="Please specify..."
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                                            value={form.improvementComments}
                                            onChange={(e) => setForm({ ...form, improvementComments: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Rating Field */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mt-4">
                                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                                    Client Rating
                                </label>
                                <div className="relative">
                                    <select
                                        value={form.rating || ''}
                                        onChange={(e) => setForm({ ...form, rating: e.target.value as Rating })}
                                        className="w-full p-3 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium capitalize"
                                    >
                                        <option value="" disabled>Select Rating</option>
                                        {RATING_OPTIONS.map((rate) => (
                                            <option key={rate} value={rate}>
                                                {rate}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Follow-up Section */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700 mt-6">
                        <label className="flex items-center justify-between cursor-pointer mb-2">
                            <span className="font-semibold text-gray-900 dark:text-white">Requires Follow-up Call?</span>
                            <input
                                type="checkbox"
                                className="w-5 h-5 text-blue-600 rounded bg-gray-100 border-gray-300 focus:ring-blue-500"
                                checked={form.requiresFollowUp}
                                onChange={(e) => setForm({ ...form, requiresFollowUp: e.target.checked })}
                            />
                        </label>

                        {form.requiresFollowUp && (
                            <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                    FOLLOW UP DATE
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    value={form.followUpDate}
                                    onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Summary Section */}
                    {isConnected && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20 mt-4">
                            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-3 uppercase tracking-wider">Call Summary</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-xs text-blue-600 dark:text-blue-300 mb-1">Final Outcome</span>
                                    <span className={`font-bold ${derivedFinalOutcome === 'Interested' ? 'text-green-600' :
                                        derivedFinalOutcome === 'Not Interested' ? 'text-red-500' : 'text-gray-500'
                                        }`}>
                                        {derivedFinalOutcome}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs text-blue-600 dark:text-blue-300 mb-1">Cross Sell</span>
                                    <span className={`font-bold ${derivedCrossSell === 'Yes' ? 'text-green-600' : 'text-gray-500'
                                        }`}>
                                        {derivedCrossSell}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-6 flex gap-3 border-t border-gray-100 dark:border-gray-700 mt-6">
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Save Feedback
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function FeedbackPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <Suspense fallback={<div className="text-center p-12 text-gray-500">Loading form...</div>}>
                <FeedbackForm />
            </Suspense>
        </div>
    )
}
