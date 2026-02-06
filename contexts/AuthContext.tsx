'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export type UserRole = 'ADMIN' | 'TELECALLER'

export type User = {
  username: string
  role: UserRole
}

type AuthContextType = {
  user: User | null
  login: (username: string, password: string) => boolean
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Simple credentials storage (hardcoded)
const CREDENTIALS = {
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'ADMIN' as UserRole,
  },
  telecaller: {
    username: 'telecaller',
    password: 'telecaller123',
    role: 'TELECALLER' as UserRole,
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Check if user is logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        localStorage.removeItem('user')
      }
    }
  }, [])

  // Protect routes based on authentication
  useEffect(() => {
    const isLoginPage = pathname === '/login'
    
    if (!user && !isLoginPage) {
      router.push('/login')
    } else if (user && isLoginPage) {
      router.push('/')
    }
  }, [user, pathname, router])

  const login = (username: string, password: string): boolean => {
    const normalizedUsername = username.toLowerCase().trim()
    
    // Check admin credentials
    if (
      normalizedUsername === CREDENTIALS.admin.username &&
      password === CREDENTIALS.admin.password
    ) {
      const userData: User = {
        username: CREDENTIALS.admin.username,
        role: CREDENTIALS.admin.role,
      }
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      return true
    }

    // Check telecaller credentials
    if (
      normalizedUsername === CREDENTIALS.telecaller.username &&
      password === CREDENTIALS.telecaller.password
    ) {
      const userData: User = {
        username: CREDENTIALS.telecaller.username,
        role: CREDENTIALS.telecaller.role,
      }
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      return true
    }

    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
