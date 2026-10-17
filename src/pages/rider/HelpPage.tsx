import React, { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { rider } from '@/api/endpoints'
import { ApiError } from '@/api/http'
import { Panel } from '@/components/app/Panel'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/StatusPill'
import { whenText, type Tone } from '@/lib/plain'
import type { DeviceInfo, HelpRequest } from '@/types/api'

const KINDS = [
  { value: 'unfamiliar_signin', label: 'I do not recognise a sign-in or phone', device: true },
  { value: 'verification_help', label: 'I need help with a verification request', device: false },
  { value: 'legitimate_change', label: 'My phone or location changed for a good reason', device: true },
  { value: 'human_review', label: 'I would like a person to review my account', device: false },
  { value: 'other', label: 'Something else', device: false },
]
const STATUS_TONE: Record<string, Tone> = { open: 'watch', in_review: 'attention', resolved: 'ok', declined: 'watch' }

const FAQ = [
  ['Why was I asked to confirm it is me?', 'Sometimes the way an account is used looks different from your usual pattern. A quick confirmation keeps your account safe. It does not mean we think you did something wrong.'],
  ['Is a new phone a problem?', 'No. Getting a new phone, changing network or moving to a new city is normal, and on its own it never blocks you. You can tell us about a new phone under Account & Verification.'],
  ['What happens if I say “that was not me”?', 'We pause your payouts and a person looks at your account. You can add more details here.'],
  ['What do you look at?', 'How the app is used: for example how quickly orders are accepted and how the account is ridden. We do not follow your location continuously and we do not collect identity documents.'],
  ['How long will a review take?', 'We cannot promise a time. You will see the status of every request below, and our reply appears there when it is ready.'],
  ['Can I see the data you hold?', 'Yes. Open Settings, then Privacy, then Download my data.'],
]

export const HelpPage: React.FC = () => {
  const [params] = useSearchParams()
  const [kind, setKind] = useState(KINDS.some((k) => k.value === params.get('kind')) ? params.get('kind')! : '')
  const [deviceId, setDeviceId] = useState(params.get('device') ?? '')
  const [message, setMessage] = useState((params.get('msg') ?? '').slice(0, 1000))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)
  const [requests, setRequests] = useState<HelpRequest[] | null>(null)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    try {
      const [r, a] = await Promise.all([rider.requests(), rider.account()])
      setRequests(r); setDevices(a.devices); setLoadError('')
    } catch (e) { setLoadError((e as Error).message) }
  }, [])
  useEffect(() => { void load() }, [load])

  const needsDevice = KINDS.find((k) => k.value === kind)?.device && devices.length > 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const found: Record<string, string> = {}
    if (!kind) found.kind = 'Choose what you need help with.'
    if (message.trim().length < 10) found.message = 'Please tell us a little more (at least 10 characters).'
    setErrors(found); setFormError(''); setSent('')
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await rider.sendRequest(kind, message, needsDevice ? deviceId : undefined)
      setSent('Your request was sent to our team. You can follow it below.')
      setMessage(''); setKind(''); setDeviceId('')
      await load()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) { setErrors(err.fields); setFormError('Please check the highlighted fields.') }
      else setFormError((err as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <Panel title="Ask for help or a review" note="A person reads every request. Do not include passwords.">
        <form onSubmit={submit} noValidate className="space-y-3">
          {sent && <Alert tone="success">{sent}</Alert>}
          {formError && <Alert tone="error">{formError}</Alert>}
          <div>
            <label htmlFor="help-kind" className="mb-1.5 block text-app-sm font-medium text-foreground">What do you need?</label>
            <select id="help-kind" value={kind} onChange={(e) => { setKind(e.target.value); setErrors((x) => ({ ...x, kind: '' })) }}
              aria-invalid={errors.kind ? true : undefined}
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-app-sm focus:outline-none focus:ring-2 focus:ring-ring/40">
              <option value="">Choose one…</option>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            {errors.kind && <p className="mt-1.5 text-app-13 text-rose-700 dark:text-rose-400">{errors.kind}</p>}
          </div>
          {needsDevice && (
            <div>
              <label htmlFor="help-device" className="mb-1.5 block text-app-sm font-medium text-foreground">Which phone? (optional)</label>
              <select id="help-device" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-app-sm focus:outline-none focus:ring-2 focus:ring-ring/40">
                <option value="">Not sure / not about one phone</option>
                {devices.map((d) => <option key={d.device_id} value={d.device_id}>{d.label}{d.current ? ' (this phone)' : ''} · last used {whenText(d.last_seen)}</option>)}
              </select>
              {errors.device_id && <p className="mt-1.5 text-app-13 text-rose-700 dark:text-rose-400">{errors.device_id}</p>}
            </div>
          )}
          <div>
            <label htmlFor="help-message" className="mb-1.5 block text-app-sm font-medium text-foreground">Tell us what happened</label>
            <textarea id="help-message" value={message} onChange={(e) => { setMessage(e.target.value); setErrors((x) => ({ ...x, message: '' })) }}
              rows={4} maxLength={1000} aria-invalid={errors.message ? true : undefined}
              placeholder="For example: I changed my phone on Saturday because the old one broke."
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-app-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40" />
            <div className="mt-1 flex justify-between gap-3 text-app-13">
              <span className="text-rose-700 dark:text-rose-400">{errors.message}</span>
              <span className="text-muted-foreground">{message.length}/1000</span>
            </div>
          </div>
          <Button type="submit" loading={busy} className="w-full sm:w-auto">{busy ? 'Sending' : 'Send request'}</Button>
        </form>
      </Panel>

      <Panel title="Your requests" flush>
        {loadError && <div className="p-4"><Alert tone="error">{loadError}</Alert></div>}
        {requests === null && !loadError ? <div className="p-5"><Spinner label="Loading your requests" /></div>
          : requests && requests.length === 0 ? <EmptyState title="No requests yet.">When you send one, you can follow it here.</EmptyState>
          : (
            <ul className="divide-y divide-border">
              {requests?.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-app-sm font-medium text-foreground">{r.kind_label}</p>
                    <StatusPill tone={STATUS_TONE[r.status]}>{r.status_label}</StatusPill>
                  </div>
                  <p className="mt-0.5 text-app-13 text-muted-foreground">Sent {whenText(r.created_at)}{r.device_label ? ` · ${r.device_label}` : ''}</p>
                  <p className="mt-1 text-app-sm text-foreground">{r.message}</p>
                  {r.response_note && (
                    <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-app-sm text-foreground">
                      <span className="font-medium">Reply from our team{r.responded_at ? ` (${whenText(r.responded_at)})` : ''}: </span>{r.response_note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
      </Panel>

      <Panel title="Common questions" flush>
        <div className="divide-y divide-border">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-4 py-3">
              <summary className="cursor-pointer list-none text-app-sm font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="mr-2 inline-block text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true">›</span>{q}
              </summary>
              <p className="mt-2 pl-4 text-app-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </Panel>
    </div>
  )
}
