'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type CompletedCall = {
    customerId: string
    customerName: string | null
    startTime: string // ISO string
    endTime: string // ISO string
    duration: string // formatted string like "5m 30s"
    status: string
}

type CallHistoryContextType = {
    completedCalls: CompletedCall[]
    addCompletedCall: (call: CompletedCall) => void
    isCustomerCalled: (customerId: string) => boolean
}

const CallHistoryContext = createContext<CallHistoryContextType | undefined>(undefined)

export function CallHistoryProvider({ children }: { children: ReactNode }) {
    const [completedCalls, setCompletedCalls] = useState<CompletedCall[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('callHistory')
        if (saved) {
            try {
                setCompletedCalls(JSON.parse(saved))
            } catch (e) {
                console.error('Failed to parse call history', e)
            }
        }
        setIsLoaded(true)
    }, [])

    // Save to localStorage whenever it changes
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('callHistory', JSON.stringify(completedCalls))
        }
    }, [completedCalls, isLoaded])

    const addCompletedCall = (call: CompletedCall) => {
        setCompletedCalls(prev => [call, ...prev])
    }

    const isCustomerCalled = (customerId: string) => {
        return completedCalls.some(call => call.customerId === customerId)
    }

    return (
        <CallHistoryContext.Provider value={{ completedCalls, addCompletedCall, isCustomerCalled }}>
            {children}
        </CallHistoryContext.Provider>
    )
}

export function useCallHistory() {
    const context = useContext(CallHistoryContext)
    if (context === undefined) {
        throw new Error('useCallHistory must be used within a CallHistoryProvider')
    }
    return context
}
