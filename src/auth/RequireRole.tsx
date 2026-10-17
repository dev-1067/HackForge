import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { Role } from '@/types/api'
import { Spinner } from '@/components/ui/Spinner'

/** Only lets the given role through. Everyone else is sent to where they belong. */
export const RequireRole: React.FC<{ role: Role; children: React.ReactElement }> = ({ role, children }) => {
  const { status, user, home } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><Spinner label="Checking your session" /></div>
  }
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/${role}/login?next=${next}`} replace />
  }
  if (user.role !== role) return <Navigate to={home} replace />
  return children
}
