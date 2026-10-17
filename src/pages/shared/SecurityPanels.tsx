import React, { useCallback, useEffect, useState } from 'react'
import { account } from '@/api/endpoints'
import { ApiError } from '@/api/http'
import { Panel } from '@/components/app/Panel'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { fullTime, whenText } from '@/lib/plain'
import { validators } from '@/lib/validate'
import type { ActiveSession, SignInRow } from '@/types/api'

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

/** Password, where you are signed in, and the recent sign-ins. Used on the rider Security page and in company Settings. */
export const SecurityPanels: React.FC = () => {
  const [sessions, setSessions] = useState<ActiveSession[] | null>(null)
  const [history, setHistory] = useState<SignInRow[] | null>(null)
  const [sessionError, setSessionError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([account.sessions(), account.signIns()])
      setSessions(s); setHistory(h); setSessionError('')
    } catch (e) { setSessionError((e as Error).message) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function signOutOthers() {
    setBusy(true); setNotice('')
    try {
      const { signed_out } = await account.signOutOthers()
      setNotice(signed_out ? `Signed out of ${signed_out} other session${signed_out === 1 ? '' : 's'}.` : 'You were not signed in anywhere else.')
      await load()
    } catch (e) { setSessionError((e as Error).message) } finally { setBusy(false) }
  }

  const newest = history?.find((h) => h.new_browser)
  return (
    <>
      {newest && (
        <Alert tone="warning">
          A sign-in from a new browser ({newest.browser}) was recorded on {fullTime(newest.at)}. If that was not you, change your password below and sign out other sessions.
        </Alert>
      )}

      <Panel title="Password">
        <PasswordForm onChanged={() => void load()} />
      </Panel>

      <Panel title="Where you are signed in" flush
        action={<Button variant="secondary" size="sm" loading={busy} disabled={!sessions || sessions.length < 2} onClick={() => void signOutOthers()}>Sign out other sessions</Button>}>
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

      <Panel title="Sign-in history" note="Your most recent sign-ins, newest first." flush>
        {history === null && !sessionError ? <div className="p-5"><Spinner label="Loading sign-ins" /></div>
          : history && history.length === 0 ? <p className="px-4 py-5 text-app-sm text-muted-foreground">No sign-ins recorded yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-app-sm">
              <thead><tr className="border-b border-border text-app-13 text-muted-foreground">
                <th className="px-4 py-2 font-medium">When</th><th className="px-4 py-2 font-medium">Browser</th><th className="px-4 py-2 font-medium">Note</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {history?.map((h) => (
                  <tr key={h.at + h.browser}>
                    <td className="whitespace-nowrap px-4 py-2 text-foreground">{fullTime(h.at)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{h.browser}</td>
                    <td className="px-4 py-2 text-app-13 text-muted-foreground">{h.current ? 'This browser' : ''}{h.new_browser ? (h.current ? ' · ' : '') + 'New browser' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}
