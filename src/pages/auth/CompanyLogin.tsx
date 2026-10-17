import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '@/api/endpoints'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { validators } from '@/lib/validate'
import { AuthShell } from './AuthShell'
import { useAuthForm } from './useAuthForm'

export const CompanyLogin: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { errors, formError, busy, submit, sessionEnded, clearError } = useAuthForm('company')

  return (
    <AuthShell
      title="Team sign in"
      subtitle="For people who review rider activity for the company."
      footer={
        <>
          <p>Need an account? <Link className="font-medium text-foreground underline underline-offset-2" to="/company/register">Join with an invite code</Link></p>
          <p>Delivery partner? <Link className="font-medium text-foreground underline underline-offset-2" to="/rider/login">Sign in here</Link></p>
        </>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit({ email, password }, { email: validators.email, password: validators.required('your password') },
            () => auth.companyLogin(email, password))
        }}
      >
        {sessionEnded && <Alert tone="info">Your session ended. Please sign in again.</Alert>}
        {formError && <Alert tone="error">{formError}</Alert>}
        <Field label="Work email" type="email" autoComplete="username" value={email}
          onChange={(v) => { setEmail(v); clearError('email') }} error={errors.email} placeholder="name@company.com" />
        <Field label="Password" type="password" autoComplete="current-password" value={password}
          onChange={(v) => { setPassword(v); clearError('password') }} error={errors.password} />
        <Button type="submit" loading={busy} className="w-full">{busy ? 'Signing in' : 'Sign in'}</Button>
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => {
              setEmail('ops@trustjuggler.demo')
              setPassword('demo-pass-123')
              clearError('email')
              clearError('password')
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Fill demo credentials (ops@trustjuggler.demo)
          </button>
        </div>
      </form>
    </AuthShell>
  )
}
