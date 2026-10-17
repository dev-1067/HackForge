import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, TriangleAlert } from 'lucide-react'
import { rider } from '@/api/endpoints'
import { DemoTag } from '@/components/app/DemoTag'
import { Panel } from '@/components/app/Panel'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/StatusPill'
import { whenText, type Tone } from '@/lib/plain'
import type { AccountOverview, DeviceInfo } from '@/types/api'
import { useRider } from './RiderContext'
import { VerificationPrompt } from './VerificationPrompt'

const STATE_TONE: Record<string, Tone> = { ok: 'ok', verification_needed: 'attention', on_hold: 'serious', suspended: 'serious' }
const RESULT_TEXT = { passed: 'You confirmed it was you', failed: 'You said it was not you', pending: 'Waiting for your answer' } as const

const DeviceRow: React.FC<{ device: DeviceInfo; onReported: () => void }> = ({ device, onReported }) => {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await rider.reportDevice(device.device_id, note.trim())
      setDone(true); setOpen(false); onReported()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-app-sm font-medium text-foreground">
          {device.label}
          {device.current && <span className="ml-2 text-app-13 font-normal text-muted-foreground">This phone</span>}
          {device.origin === 'demo' && <DemoTag />}
        </p>
        <p className="text-app-13 text-muted-foreground">Last used {whenText(device.last_seen)}</p>
      </div>
      <p className="text-app-13 text-muted-foreground">
        {[device.os, device.city, `${device.sessions} session${device.sessions === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
        {' · first seen '}{whenText(device.first_seen)}
      </p>

      {device.reported || done ? (
        <p className="mt-1.5 text-app-13 font-medium text-emerald-700 dark:text-emerald-400">You told us this is your phone. The team can see this note.</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-app-13">
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
            className="font-medium text-foreground underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            This is my phone
          </button>
          <Link to={`/rider/help?kind=unfamiliar_signin&device=${encodeURIComponent(device.device_id)}`}
            className="text-muted-foreground underline underline-offset-2">I do not recognise it</Link>
        </div>
      )}

      {open && (
        <form onSubmit={submit} className="mt-2 space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
          <label htmlFor={`note-${device.device_id}`} className="block text-app-sm font-medium text-foreground">Anything we should know? (optional)</label>
          <textarea id={`note-${device.device_id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={900}
            placeholder="For example: I bought a new phone on Saturday."
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-app-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
          {error && <Alert tone="error">{error}</Alert>}
          <p className="text-app-13 text-muted-foreground">This is a note for the team. It does not skip any check you may be asked to complete.</p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={busy}>Send note</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </li>
  )
}

export const AccountPage: React.FC = () => {
  const { refresh, version } = useRider()
  const [data, setData] = useState<AccountOverview | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try { setData(await rider.account()); setError('') } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { void load() }, [load, version])

  if (!data) return error ? <Alert tone="error">{error}</Alert> : <Spinner label="Loading your account" />
  const { status, verification, profile } = data

  return (
    <div className="space-y-4">
      <Panel>
        <StatusPill tone={STATE_TONE[status.state]}>{status.state === 'ok' ? 'Active' : status.state === 'verification_needed' ? 'Action needed' : status.state === 'on_hold' ? 'Being reviewed' : 'Paused'}</StatusPill>
        <h2 className="mt-1.5 text-app-lg font-semibold text-foreground">
          {status.state === 'ok' ? 'Your account is active.' : status.headline}
        </h2>
        <p className="mt-0.5 text-app-sm text-muted-foreground">
          {status.state === 'on_hold' ? 'Your request is being reviewed. ' : ''}{status.detail}
        </p>
        <p className="mt-1 text-app-13 text-muted-foreground">
          Latest verification: {verification.latest_event_at ? whenText(verification.latest_event_at) : 'none yet'}
        </p>
      </Panel>

      {verification.outstanding && (
        <Panel title="Please complete the requested verification">
          <p className="mb-3 text-app-sm text-muted-foreground">
            {verification.outstanding.message}{verification.outstanding.origin === 'demo' && <DemoTag />}
          </p>
          <VerificationPrompt onAnswered={() => void load()} />
        </Panel>
      )}

      <Panel title="Account check-up" flush>
        <ul className="divide-y divide-border">
          {data.checkup.map((row) => (
            <li key={row.key} className="flex items-start gap-3 px-4 py-2.5">
              {row.ok
                ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Fine" />
                : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="Needs a look" />}
              <span className="text-app-sm text-foreground">{row.text}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Your phones" note="Phones we have seen on your account. A new phone is normal and is not a problem on its own." flush>
        {data.devices.length === 0 ? (
          <EmptyState title="No phones yet.">They appear here after your first deliveries.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {data.devices.map((d) => <DeviceRow key={d.device_id} device={d} onReported={() => { void load(); void refresh() }} />)}
          </ul>
        )}
      </Panel>

      <Panel title="Verification history" flush>
        {verification.history.length === 0 ? (
          <EmptyState title="Nothing so far.">If we ever ask you to confirm it is you, it will be listed here.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {verification.history.map((h, i) => (
              <li key={`${h.requested_at}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                <span className="text-app-sm text-foreground">{RESULT_TEXT[h.result]}{h.origin === 'demo' && <DemoTag />}</span>
                <span className="text-app-13 text-muted-foreground">{whenText(h.resolved_at ?? h.requested_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="About you">
        <dl className="grid gap-x-6 gap-y-2 text-app-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Name</dt><dd className="font-medium text-foreground">{profile.name}</dd></div>
          <div><dt className="text-muted-foreground">Mobile number</dt><dd className="font-medium text-foreground">{profile.phone_hint ?? '—'}</dd></div>
          <div><dt className="text-muted-foreground">Partner ID</dt><dd className="font-medium text-foreground">{profile.rider_id}</dd></div>
          <div><dt className="text-muted-foreground">Member since</dt><dd className="font-medium text-foreground">{profile.member_since ? new Date(profile.member_since).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</dd></div>
        </dl>
        <p className="mt-3 text-app-13 text-muted-foreground">
          Something looks wrong? <Link to="/rider/help" className="font-medium text-foreground underline underline-offset-2">Ask for a review</Link>.
        </p>
      </Panel>
    </div>
  )
}
