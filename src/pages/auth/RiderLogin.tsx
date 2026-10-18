import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '@/api/endpoints'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { validators } from '@/lib/validate'
import { AuthShell } from './AuthShell'
import { useAuthForm } from './useAuthForm'

export const RiderLogin: React.FC = () => {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const { errors, formError, busy, submit, sessionEnded, clearError } = useAuthForm('rider')

  return (
    <AuthShell
      title="Delivery partner sign in"
      subtitle="Use the mobile number you registered with."
      footer={
        <>
          <p>New here? <Link className="font-medium text-foreground underline underline-offset-2" to="/rider/register">Create an account</Link></p>
          <p>Work for the company? <Link className="font-medium text-foreground underline underline-offset-2" to="/company/login">Team sign in</Link></p>
        </>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit({ phone, password }, { phone: validators.phone, password: validators.required('your password') },
            () => auth.riderLogin(phone, password))
        }}
      >
        {sessionEnded && <Alert tone="info">Your session ended. Please sign in again.</Alert>}
        {formError && <Alert tone="error">{formError}</Alert>}
        <Field label="Mobile number" type="tel" inputMode="tel" autoComplete="tel" value={phone}
          onChange={(v) => { setPhone(v); clearError('phone') }} error={errors.phone} placeholder="98765 43210" />
        <Field label="Password" type="password" autoComplete="current-password" value={password}
          onChange={(v) => { setPassword(v); clearError('password') }} error={errors.password} />
        <Button type="submit" loading={busy} className="w-full">{busy ? 'Signing in' : 'Sign in'}</Button>
        <div className="pt-2 text-center">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((num) => {
              const p = `900000${String(num).padStart(4, '0')}`
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setPhone(p)
                    setPassword('demo-pass-123')
                    clearError('phone')
                    clearError('password')
                  }}
                  className="rounded-md border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  Rider {num}
                </button>
              )
            })}
          </div>
        </div>
      </form>
    </AuthShell>
  )
}
