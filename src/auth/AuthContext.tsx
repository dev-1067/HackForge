import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { auth } from '@/api/endpoints'
import { ApiError, onUnauthorized, setCsrfToken } from '@/api/http'
import type { Role, Session, User } from '@/types/api'

type Status = 'loading' | 'authenticated' | 'anonymous'

interface AuthValue {
  status: Status
  user: User | null
  home: string
  sessionEnded: boolean
  signIn: (action: () => Promise<Session>) => Promise<Session>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | undefined>(undefined)

export const HOME_FOR_ROLE: Record<Role, string> = { rider: '/rider', company: '/dashboard' }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [sessionEnded, setSessionEnded] = useState(false)

  const apply = useCallback((session: Session | null) => {
    setCsrfToken(session?.csrf_token ?? '')
    setUser(session?.user ?? null)
    setStatus(session ? 'authenticated' : 'anonymous')
  }, [])

  useEffect(() => {
    let cancelled = false
    auth.me()
      .then((session) => { if (!cancelled) apply(session) })
      .catch(() => { if (!cancelled) apply(null) })
    return () => { cancelled = true }
  }, [apply])

  useEffect(() => {
    onUnauthorized(() => {
      setSessionEnded(true)
      apply(null)
    })
    return () => onUnauthorized(null)
  }, [apply])

  const signIn = useCallback(async (action: () => Promise<Session>) => {
    const session = await action()
    setSessionEnded(false)
    apply(session)
    return session
  }, [apply])

  const signOut = useCallback(async () => {
    try {
      await auth.logout()
    } catch (error) {
      // An already-ended session is the same outcome as signing out.
      if (!(error instanceof ApiError) || error.status !== 401) throw error
    } finally {
      setSessionEnded(false)
      apply(null)
    }
  }, [apply])

  const value = useMemo<AuthValue>(() => ({
    status, user, sessionEnded, signIn, signOut,
    home: user ? HOME_FOR_ROLE[user.role] : '/login',
  }), [status, user, sessionEnded, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
