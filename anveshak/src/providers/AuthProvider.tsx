'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { signIn as authSignIn, signOut as authSignOut, getToken, COGNITO_ENABLED } from '@/lib/auth'
import Cookies from 'js-cookie'

interface AuthUser {
  email: string
  role: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  loading: boolean
  cognitoEnabled: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  token: () => Promise<string>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const accessToken = Cookies.get('accessToken')
    const storedEmail = Cookies.get('userEmail')
    if (accessToken) {
      setUser({ email: storedEmail || 'officer@gov.in', role: 'admin' })
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await authSignIn(email, password)
    setUser({ email, role: 'admin' })
  }, [])

  const logout = useCallback(async () => {
    await authSignOut()
    Cookies.remove('accessToken')
    Cookies.remove('userEmail')
    setUser(null)
  }, [])

  const token = useCallback(async () => {
    return await getToken()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        cognitoEnabled: COGNITO_ENABLED,
        login,
        logout,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
