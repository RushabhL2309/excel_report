'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type ExcelDataContextType = {
  excelBuffer: ArrayBuffer | null
  fileName: string | null
  setExcelData: (buffer: ArrayBuffer, fileName: string) => void
  clearExcelData: () => void
}

const ExcelDataContext = createContext<ExcelDataContextType | undefined>(undefined)

export function ExcelDataProvider({ children }: { children: ReactNode }) {
  const [excelBuffer, setExcelBuffer] = useState<ArrayBuffer | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const setExcelData = (buffer: ArrayBuffer, fileName: string) => {
    setExcelBuffer(buffer)
    setFileName(fileName)
  }

  const clearExcelData = () => {
    setExcelBuffer(null)
    setFileName(null)
  }

  return (
    <ExcelDataContext.Provider value={{ excelBuffer, fileName, setExcelData, clearExcelData }}>
      {children}
    </ExcelDataContext.Provider>
  )
}

export function useExcelData() {
  const context = useContext(ExcelDataContext)
  if (context === undefined) {
    throw new Error('useExcelData must be used within an ExcelDataProvider')
  }
  return context
}



