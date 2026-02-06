import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ExcelDataProvider } from '@/contexts/ExcelDataContext'
import { CallHistoryProvider } from '@/contexts/CallHistoryContext'
import LayoutContent from '@/components/LayoutContent'

export const metadata: Metadata = {
  title: 'Excel Report Dashboard',
  description: 'Dashboard for Excel Report Management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ExcelDataProvider>
            <CallHistoryProvider>
              <LayoutContent>{children}</LayoutContent>
            </CallHistoryProvider>
          </ExcelDataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
