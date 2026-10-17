import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '@/api/endpoints'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { validators } from '@/lib/validate'
import { AuthShell } from './AuthShell'
import { useAuthForm } from './useAuthForm'

export const RiderRegister: React.FC = () => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const { errors, formError, busy, submit, clearError } = useAuthForm('rider')

  return (
    <AuthShell
      title="Create your account"
      subtitle="Just your name, mobile number and a password."
      footer={<p>Already registered? <Link className="font-medium text-foreground underline underline-offset-2" to="/rider/login">Sign in</Link></p>}
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit(
            { name, phone, password, confirm },
            {
              name: validators.name,
              phone: validators.phone,
              password: validators.newPassword,
              confirm: (v) => (v === password ? '' : 'The passwords do not match.'),
            },
            () => auth.riderRegister(name, phone, password),
          )
        }}
      >
        {formError && <Alert tone="error">{formError}</Alert>}
        <Field label="Full name" autoComplete="name" value={name} onChange={(v) => { setName(v); clearError('name') }} error={errors.name} />
        <Field label="Mobile number" type="tel" inputMode="tel" autoComplete="tel" value={phone}
          onChange={(v) => { setPhone(v); clearError('phone') }} error={errors.phone} placeholder="98765 43210" />
        <Field label="Password" type="password" autoComplete="new-password" value={password}
          onChange={(v) => { setPassword(v); clearError('password') }} error={errors.password}
          hint="At least 8 characters, with letters and numbers." />
        <Field label="Confirm password" type="password" autoComplete="new-password" value={confirm}
          onChange={(v) => { setConfirm(v); clearError('confirm') }} error={errors.confirm} />
        <Button type="submit" loading={busy} className="w-full">{busy ? 'Creating account' : 'Create account'}</Button>
      </form>
    </AuthShell>
  )
}
