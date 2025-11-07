import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
