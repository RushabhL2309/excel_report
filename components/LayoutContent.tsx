'use client'

import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()

  // Don't show sidebar on login page
  if (pathname === '/login') {
    return <>{children}</>
  }

  // Show sidebar for authenticated users
  if (isAuthenticated) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-h-screen">
          {children}
        </div>
      </div>
    )
  }

  // Show nothing while checking auth (will redirect to login)
  return null
}
