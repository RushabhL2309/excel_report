'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen">
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Navigation</h2>
        <nav className="space-y-2">
          <Link
            href="/"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              pathname === '/'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className="mr-3">📊</span>
            <span>Incentives</span>
          </Link>
          <Link
            href="/customers"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              pathname === '/customers'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className="mr-3">👥</span>
            <span>Customers</span>
          </Link>
          <Link
            href="/crm"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              pathname === '/crm' || pathname?.startsWith('/crm')
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className="mr-3">📞</span>
            <span>CRM Calls</span>
          </Link>
        </nav>
      </div>
    </aside>
  )
}

