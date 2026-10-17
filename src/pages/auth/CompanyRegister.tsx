import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '@/api/endpoints'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { validators } from '@/lib/validate'
import { AuthShell } from './AuthShell'
import { useAuthForm } from './useAuthForm'

export const CompanyRegister: React.FC = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState('')
  const { errors, formError, busy, submit, clearError } = useAuthForm('company')

  return (
    <AuthShell
      title="Join your team"
      subtitle="Ask your administrator for the invite code."
      footer={<p>Already have an account? <Link className="font-medium text-foreground underline underline-offset-2" to="/company/login">Sign in</Link></p>}
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit(
            { name, email, password, invite_code: invite },
            { name: validators.name, email: validators.email, password: validators.newPassword, invite_code: validators.required('the invite code') },
            () => auth.companyRegister(name, email, password, invite),
          )
        }}
      >
        {formError && <Alert tone="error">{formError}</Alert>}
        <Field label="Full name" autoComplete="name" value={name} onChange={(v) => { setName(v); clearError('name') }} error={errors.name} />
        <Field label="Work email" type="email" autoComplete="username" value={email}
          onChange={(v) => { setEmail(v); clearError('email') }} error={errors.email} />
        <Field label="Password" type="password" autoComplete="new-password" value={password}
          onChange={(v) => { setPassword(v); clearError('password') }} error={errors.password}
          hint="At least 8 characters, with letters and numbers." />
        <Field label="Invite code" value={invite} autoComplete="off"
          onChange={(v) => { setInvite(v); clearError('invite_code') }} error={errors.invite_code} />
        <Button type="submit" loading={busy} className="w-full">{busy ? 'Creating account' : 'Create account'}</Button>
      </form>
    </AuthShell>
  )
}
