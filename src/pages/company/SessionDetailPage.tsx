import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ops } from '@/api/endpoints'
import { ApiError } from '@/api/http'
import { Panel } from '@/components/app/Panel'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/StatusPill'
import { LEVEL_LABEL, LEVEL_TONE, STATUS_LABEL, actorLabel, describeFlags, explain, featureName, formatBaseline, fullTime } from '@/lib/plain'
import type { Decision } from '@/types/api'

const VERDICT: Record<string, string> = {
  dismissed: 'Cleared after review', confirmed_takeover: 'Suspended after review', rider_verified: 'The rider confirmed it was them',
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
    <dt className="shrink-0 text-app-sm text-muted-foreground sm:w-44">{label}</dt>
    <dd className="min-w-0 break-words text-app-sm text-foreground">{children}</dd>
  </div>
)

/** One session and the decision made for it. Reached by session ID, decision number, or from a list. */
export const SessionDetailPage: React.FC = () => {
  const { kind = 'decision', id = '' } = useParams()
  const [d, setD] = useState<Decision | null>(null)
  const [error, setError] = useState('')
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let live = true
    setD(null); setError(''); setMissing(false)
    const call = kind === 'session' ? ops.sessionLookup(id) : /^\d+$/.test(id) ? ops.decision(Number(id)) : Promise.reject(new ApiError(404, 'bad id'))
    call.then((x) => { if (live) setD(x) }).catch((e) => {
      if (!live) return
      if (e instanceof ApiError && (e.status === 404 || e.status === 422)) setMissing(true)
      else setError((e as Error).message)
    })
    return () => { live = false }
  }, [kind, id])

  const back = <Link to="/sessions" className="text-app-sm text-muted-foreground underline underline-offset-2">← Sessions</Link>
  if (missing) {
    return (
      <div className="space-y-3">
        {back}
        <Alert tone="warning">
          We could not find {kind === 'session' ? 'a session with the ID' : 'a decision numbered'} “{id}”.
          Check the {kind === 'session' ? 'session ID' : 'decision number'} and the type you chose, then try again.
        </Alert>
      </div>
    )
  }
  if (!d) return <div className="space-y-3">{back}{error ? <Alert tone="error">{error}</Alert> : <Spinner label="Loading session" />}</div>

  const { summary, bullets } = explain(d)
  const name = d.rider_name ?? `Rider ${d.rider_id}`
  const ctx = d.session?.context ?? {}
  const habit = d.session?.habit ?? {}
  const baseline = d.rider?.baseline ?? {}
  const habitKeys = Object.keys(habit).filter((k) => featureName(k) !== k)
  const pending = d.level !== 'L0' && d.level !== 'L1' && !d.review_verdict && ['L2', 'L3', 'L4'].includes(d.level)

  return (
    <div className="space-y-4">
      {back}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-app-xl font-semibold text-foreground">Session for {name}</h2>
          <StatusPill tone={LEVEL_TONE[d.level]}>{LEVEL_LABEL[d.level]}</StatusPill>
        </div>
        <Link to={`/riders/${encodeURIComponent(d.rider_id)}`} className="text-app-sm font-medium text-foreground underline underline-offset-2">Open {name}’s profile</Link>
      </div>

      <Panel title="What happened">
        <p className="text-app-sm text-foreground">{summary}</p>
        {bullets.length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-app-sm text-muted-foreground">{bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
        <p className="mt-2 text-app-13 text-muted-foreground">A new phone or place is a reason to take a closer look, not proof that the account is being shared.</p>
        {pending && <p className="mt-2 text-app-sm"><Link to="/review-queue" className="font-medium underline">This account has an open case. Go to Needs review.</Link></p>}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Details" >
          <dl className="divide-y divide-border">
            <Row label="Session started">{fullTime(d.started_at)}</Row>
            <Row label="Decision made">{fullTime(d.decided_at)}</Row>
            <Row label="Rider">{name} <span className="text-muted-foreground">{d.rider_id}</span></Row>
            <Row label="Account now">{STATUS_LABEL[d.rider?.status ?? d.status] ?? d.status}</Row>
            <Row label="Where">{[ctx.city, ctx.zone].filter(Boolean).join(' · ') || '—'}</Row>
            <Row label="Phone">{ctx.device_id ? `Ending ${String(ctx.device_id).slice(-4)}` : '—'}{ctx.os ? ` · ${ctx.os}` : ''}</Row>
            <Row label="Connection">{ctx.network_type || '—'}</Row>
            <Row label="Changes noticed">{d.context_flags.length ? describeFlags(d.context_flags) : 'None. Same phone and area as usual.'}</Row>
            <Row label="Review">
              {d.review_verdict ? `${VERDICT[d.review_verdict] ?? d.review_verdict}${d.reviewed_by ? ` by ${actorLabel(d.reviewed_by === 'rider' ? 'rider:' : `reviewer:${d.reviewed_by}`)}` : ''}${d.reviewed_at ? `, ${fullTime(d.reviewed_at)}` : ''}` : pending ? 'Waiting for a reviewer' : 'Not needed'}
            </Row>
            <Row label="Session ID"><code className="text-app-13">{d.session_id}</code></Row>
            <Row label="Decision number">{d.decision_id}</Row>
          </dl>
        </Panel>

        <Panel title="How the rider behaved" note="This session compared with the rider’s usual pattern.">
          {habitKeys.length === 0 ? <p className="text-app-sm text-muted-foreground">No behaviour details were recorded for this session.</p> : (
            <table className="w-full text-left text-app-sm">
              <thead><tr className="text-app-13 text-muted-foreground"><th className="py-1 pr-3 font-medium">Measure</th><th className="py-1 pr-3 font-medium">This session</th><th className="py-1 font-medium">Usual</th></tr></thead>
              <tbody className="divide-y divide-border">
                {habitKeys.map((k) => (
                  <tr key={k}>
                    <td className="py-1.5 pr-3 text-muted-foreground">{featureName(k)}</td>
                    <td className="py-1.5 pr-3 font-medium text-foreground">{formatBaseline(k, Number(habit[k]))}</td>
                    <td className="py-1.5 text-muted-foreground">{k in baseline ? formatBaseline(k, baseline[k]) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  )
}
