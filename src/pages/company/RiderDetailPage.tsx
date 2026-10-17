import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ops } from '@/api/endpoints'
import { ApiError } from '@/api/http'
import { useOps } from '@/components/app/OpsContext'
import { Panel } from '@/components/app/Panel'
import { TrendChart, type TrendPoint } from '@/components/app/TrendChart'
import { SelectFilter } from '@/components/app/FilterBar'
import { RANGES, rangeSince, type RangeKey } from '@/lib/ranges'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/StatusPill'
import {
  LEVEL_LABEL, LEVEL_TONE, STATUS_LABEL, STATUS_TONE, actorLabel, auditSentence, describeFlags, featureName, formatBaseline, whenText,
} from '@/lib/plain'
import type { AuditEntry, RiderDetail, TeamRequest, TimelineItem } from '@/types/api'

const BASELINE_ORDER = ['accept_latency_ms', 'idle_gap_min', 'cancel_rate', 'accept_rate', 'login_hour', 'avg_speed_kmh', 'route_deviation', 'orders_per_hour', 'tap_interval_ms', 'swipe_speed']

export const RiderDetailPage: React.FC = () => {
  const { riderId = '' } = useParams()
  const { changeTick } = useOps()
  const [rider, setRider] = useState<RiderDetail | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [requests, setRequests] = useState<TeamRequest[]>([])
  const [error, setError] = useState('')
  const [missing, setMissing] = useState(false)
  const [range, setRange] = useState<RangeKey>('all')
  const [city, setCity] = useState('')
  const [device, setDevice] = useState('')
  const [sessionError, setSessionError] = useState('')

  const load = useCallback(async () => {
    try {
      const [r, a, q] = await Promise.all([ops.rider(riderId), ops.riderAudit(riderId), ops.requests({ rider_id: riderId })])
      setRider(r); setAudit(a); setRequests(q); setError(''); setMissing(false)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setMissing(true)
      else setError((e as Error).message)
    }
  }, [riderId])

  const loadSessions = useCallback(async () => {
    try {
      setTimeline(await ops.timeline(riderId, 120, { since: rangeSince(range), city, device: device.trim() }))
      setSessionError('')
    } catch (e) { setSessionError((e as Error).message) }
  }, [riderId, range, city, device])
  useEffect(() => { void loadSessions() }, [loadSessions, changeTick])

  useEffect(() => { setRider(null); void load() }, [load])
  useEffect(() => { if (changeTick > 0) void load() }, [changeTick, load])

  const chart: TrendPoint[] = useMemo(() => timeline.map((t) => ({
    label: new Date(t.started_at).toLocaleDateString([], { day: 'numeric', month: 'short' }),
    change: t.evidence_score,
    line: t.threshold,
    note: t.context_flags.some((f) => f === 'new_device' || f === 'new_city'),
    detail: t.context_flags.length ? `New: ${describeFlags(t.context_flags)}` : LEVEL_LABEL[t.level],
  })), [timeline])

  if (missing) {
    return (
      <div className="space-y-3">
        <Link to="/riders" className="text-app-sm text-muted-foreground underline underline-offset-2">Back to riders</Link>
        <Alert tone="warning">We could not find a rider with the ID “{riderId}”.</Alert>
      </div>
    )
  }
  if (!rider) return error ? <Alert tone="error">{error}</Alert> : <Spinner label="Loading rider" />

  const name = rider.name ?? `Rider ${rider.rider_id}`
  return (
    <div className="space-y-4">
      <Link to="/riders" className="text-app-sm text-muted-foreground underline underline-offset-2">← All riders</Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-app-xl font-semibold text-foreground">{name}</h2>
          <span className="text-app-sm text-muted-foreground">{rider.rider_id}</span>
          <StatusPill tone={STATUS_TONE[rider.status] ?? 'ok'}>{STATUS_LABEL[rider.status] ?? rider.status}</StatusPill>
        </div>
        <p className="text-app-sm text-muted-foreground">
          {rider.sessions_seen} sessions · last seen {whenText(rider.last_seen_at)}
          {rider.known_devices > 0 && ` · ${rider.known_devices} phone${rider.known_devices === 1 ? '' : 's'}`}
          {rider.known_cities.length > 0 && ` · ${rider.known_cities.join(', ')}`}
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {rider.status === 'pending_stepup' || rider.status === 'held' ? (
        <Alert tone="warning">
          This account has an open case. <Link to="/review-queue" className="font-medium underline">Go to Needs review</Link>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Activity compared with usual" note="Blue dots mark a new phone or place." className="lg:col-span-2">
          <TrendChart data={chart} height={200} />
        </Panel>
        <Panel title="Usual pattern">
          {Object.keys(rider.baseline).length === 0 ? (
            <p className="text-app-sm text-muted-foreground">Still learning this rider’s pattern.</p>
          ) : (
            <dl className="space-y-1.5 text-app-sm">
              {BASELINE_ORDER.filter((k) => k in rider.baseline).map((key) => (
                <div key={key} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{featureName(key)}</dt>
                  <dd className="font-medium text-foreground">{formatBaseline(key, rider.baseline[key])}</dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>
      </div>

      <Panel
        title="Recent sessions"
        flush
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SelectFilter label="Date range" value={range} onChange={(v) => setRange(v as RangeKey)} options={RANGES} className="py-1.5 text-app-13" />
            <SelectFilter label="City" value={city} onChange={setCity} className="py-1.5 text-app-13"
              options={[{ value: '', label: 'All cities' }, ...rider.known_cities.map((c) => ({ value: c, label: c }))]} />
            <input value={device} onChange={(e) => setDevice(e.target.value)} aria-label="Phone ending" placeholder="Phone ending…" maxLength={20}
              className="w-32 rounded-lg border border-border bg-card px-3 py-1.5 text-app-13 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40" />
          </div>
        }
      >
        {sessionError && <p role="alert" className="px-4 py-3 text-app-sm text-rose-700 dark:text-rose-400">{sessionError}</p>}
        {timeline.length === 0 ? (
          range !== 'all' || city || device.trim()
            ? <EmptyState title="No sessions match.">Try a wider date range or clear the city or phone filter.</EmptyState>
            : <EmptyState title="No sessions yet.">Activity appears here after the rider’s first deliveries.</EmptyState>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[520px] text-left text-app-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-app-13 text-muted-foreground">
                  <th className="px-4 py-2 font-medium">When</th><th className="px-4 py-2 font-medium">Where</th>
                  <th className="px-4 py-2 font-medium">Phone</th><th className="px-4 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...timeline].reverse().slice(0, 40).map((t) => (
                  <tr key={t.session_id}>
                    <td className="whitespace-nowrap px-4 py-2">
                      <Link to={`/sessions/session/${encodeURIComponent(t.session_id)}`} title="Open this session" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">{whenText(t.started_at)}</Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{[t.city, t.zone].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">…{(t.device_id ?? '').slice(-4)}{t.context_flags.includes('new_device') ? ' (new)' : ''}</td>
                    <td className="px-4 py-2"><StatusPill tone={LEVEL_TONE[t.level]}>{LEVEL_LABEL[t.level]}</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {requests.length > 0 && (
        <Panel title="Requests from this rider" flush>
          <ul className="divide-y divide-border text-app-sm">
            {requests.map((q) => (
              <li key={q.id} className="px-4 py-2.5">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-foreground">{q.kind_label}{q.device_label ? ` · ${q.device_label}` : ''}</span>
                  <span className="text-app-13 text-muted-foreground">{q.status_label} · {whenText(q.created_at)}</span>
                </div>
                <p className="text-muted-foreground">{q.message}</p>
                {q.response_note && <p className="mt-1 text-foreground">Reply: {q.response_note}</p>}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {audit.length > 0 && (
        <Panel title="History" flush>
          <ul className="divide-y divide-border text-app-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 px-4 py-2">
                <span className="text-foreground">{auditSentence(a)}</span>
                <span className="text-app-13 text-muted-foreground">{actorLabel(a.actor)} · {whenText(a.at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
