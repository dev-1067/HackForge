import React, { useCallback, useEffect, useState } from 'react'
import { account, rider } from '@/api/endpoints'
import { ApiError } from '@/api/http'
import { useAuth } from '@/auth/AuthContext'
import { Panel } from '@/components/app/Panel'
import { Segmented } from '@/components/app/Segmented'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { TEXT_SIZES, usePreferences } from '@/hooks/usePreferences'
import { useTheme } from '@/hooks/useTheme'
import { whenText } from '@/lib/plain'
import { validators } from '@/lib/validate'
import type { ActiveSession } from '@/types/api'

const PasswordForm: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const found: Record<string, string> = {}
    if (!current) found.current_password = 'Enter your current password.'
    const weak = validators.newPassword(next)
    if (weak) found.new_password = weak
    if (again !== next) found.again = 'The passwords do not match.'
    setErrors(found); setMessage(null)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const result = await account.changePassword(current, next)
      setMessage({ tone: 'success', text: result.signed_out_elsewhere > 0 ? `Password changed. ${result.signed_out_elsewhere} other session${result.signed_out_elsewhere === 1 ? ' was' : 's were'} signed out.` : 'Password changed.' })
      setCurrent(''); setNext(''); setAgain(''); onChanged()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields)
      setMessage({ tone: 'error', text: (err as Error).message })
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <Field label="Current password" type="password" autoComplete="current-password" value={current}
        onChange={(v) => { setCurrent(v); setErrors((x) => ({ ...x, current_password: '' })) }} error={errors.current_password} />
      <Field label="New password" type="password" autoComplete="new-password" value={next}
        onChange={(v) => { setNext(v); setErrors((x) => ({ ...x, new_password: '' })) }} error={errors.new_password}
        hint="At least 8 characters, with letters and numbers." />
      <Field label="Confirm new password" type="password" autoComplete="new-password" value={again}
        onChange={(v) => { setAgain(v); setErrors((x) => ({ ...x, again: '' })) }} error={errors.again} />
      <Button type="submit" loading={busy}>Change password</Button>
    </form>
  )
}

export const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { textSize, setTextSize } = usePreferences()
  const [sessions, setSessions] = useState<ActiveSession[] | null>(null)
  const [sessionError, setSessionError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const [exportError, setExportError] = useState('')
  const isRider = user?.role === 'rider'

  const loadSessions = useCallback(async () => {
    try { setSessions(await account.sessions()); setSessionError('') } catch (e) { setSessionError((e as Error).message) }
  }, [])
  useEffect(() => { void loadSessions() }, [loadSessions])

  async function signOutOthers() {
    setBusy('others'); setNotice('')
    try {
      const { signed_out } = await account.signOutOthers()
      setNotice(signed_out ? `Signed out of ${signed_out} other session${signed_out === 1 ? '' : 's'}.` : 'You were not signed in anywhere else.')
      await loadSessions()
    } catch (e) { setSessionError((e as Error).message) } finally { setBusy('') }
  }

  async function download() {
    setBusy('export'); setExportError('')
    try {
      const data = await rider.exportData()
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'trust-juggler-my-data.json'
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) { setExportError((e as Error).message) } finally { setBusy('') }
  }

  return (
    <div className="space-y-4">
      <Panel title="Appearance">
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-app-sm font-medium text-foreground">Theme</p>
            <Segmented label="Theme" value={theme} onChange={setTheme}
              options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          </div>
          <div>
            <p className="mb-1.5 text-app-sm font-medium text-foreground">Text size</p>
            <Segmented label="Text size" value={textSize} onChange={setTextSize} options={TEXT_SIZES} />
            <p className="mt-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-app-sm text-foreground">
              This is how text looks at the size you chose. Your choice is saved on this device.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Password">
        <PasswordForm onChanged={() => void loadSessions()} />
      </Panel>

      <Panel title="Where you are signed in" flush
        action={<Button variant="secondary" size="sm" loading={busy === 'others'} disabled={!sessions || sessions.length < 2} onClick={() => void signOutOthers()}>Sign out other sessions</Button>}>
        {notice && <div className="p-4 pb-0"><Alert tone="success">{notice}</Alert></div>}
        {sessionError && <div className="p-4"><Alert tone="error">{sessionError}</Alert></div>}
        {sessions === null && !sessionError ? <div className="p-5"><Spinner label="Loading sessions" /></div> : (
          <ul className="divide-y divide-border">
            {sessions?.map((s) => (
              <li key={s.signed_in_at + s.browser} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                <span className="text-app-sm text-foreground">
                  {s.browser}{s.current && <span className="ml-2 text-app-13 text-muted-foreground">This browser</span>}
                  {s.is_new_browser && <span className="ml-2 text-app-13 text-amber-700 dark:text-amber-400">New browser</span>}
                </span>
                <span className="text-app-13 text-muted-foreground">Signed in {whenText(s.signed_in_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {isRider && (
        <Panel title="Privacy">
          <p className="text-app-sm text-muted-foreground">
            We keep your name, mobile number, the phones seen on your account, your sign-ins and your requests. We do not follow your location continuously,
            and we do not collect identity documents or photos.
          </p>
          {exportError && <Alert tone="error" className="mt-3">{exportError}</Alert>}
          <Button variant="secondary" className="mt-3" loading={busy === 'export'} onClick={() => void download()}>Download my data</Button>
        </Panel>
      )}

      <Panel title="Account">
        <p className="text-app-sm text-muted-foreground">Signed in as <span className="font-medium text-foreground">{user?.name}</span>.</p>
        <Button variant="secondary" className="mt-3" loading={busy === 'out'} onClick={() => { setBusy('out'); void signOut().finally(() => setBusy('')) }}>Sign out</Button>
      </Panel>
    </div>
  )
}
