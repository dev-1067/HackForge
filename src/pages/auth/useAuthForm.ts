import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/http'
import { useAuth } from '@/auth/AuthContext'
import type { Session } from '@/types/api'
import { check, type Errors } from '@/lib/validate'

/** Shared submit behaviour for the four sign-in / sign-up forms. */
export function useAuthForm(role: 'rider' | 'company') {
  const { signIn, sessionEnded } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const next = new URLSearchParams(location.search).get('next')
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null

  async function submit(
    values: Record<string, string>,
    rules: Record<string, (v: string) => string>,
    action: () => Promise<Session>,
  ) {
    const found = check(values, rules)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length > 0) return
    setBusy(true)
    try {
      const session = await signIn(action)
      const allowed = safeNext && (role === 'rider' ? safeNext.startsWith('/rider') : !safeNext.startsWith('/rider'))
      navigate(allowed ? safeNext : session.home, { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields)
        setFormError(Object.keys(error.fields).length > 0 ? 'Please check the highlighted fields.' : error.message)
      } else {
        setFormError('Something went wrong. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return { errors, formError, busy, submit, sessionEnded, clearError: (field: string) => setErrors((e) => ({ ...e, [field]: '' })) }
}
