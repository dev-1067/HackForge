import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ops } from '@/api/endpoints'
import { useOps } from '@/components/app/OpsContext'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/StatusPill'
import { STATUS_LABEL, STATUS_TONE, explain, whenText } from '@/lib/plain'
import type { Decision, TeamRequest } from '@/types/api'
import { RequestCard } from './RequestCard'

type Verdict = 'clear' | 'suspend'

const CaseCard: React.FC<{ decision: Decision; count: number; onDone: (message: string) => void }> = ({ decision, count, onDone }) => {
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState<Verdict | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { summary, bullets } = { summary: explain(decision).summary, bullets: explain(decision).bullets }
  const name = decision.rider_name ?? `Rider ${decision.rider_id}`

  async function decide(verdict: Verdict) {
    setBusy(true)
    setError('')
    try {
      await ops.review(decision.decision_id, verdict === 'suspend', note.trim())
      onDone(verdict === 'suspend' ? `${name}'s account was suspended.` : `${name}'s account was cleared.`)
    } catch (e) {
      setError((e as Error).message)
      setConfirming(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <Link to={`/riders/${encodeURIComponent(decision.rider_id)}`} className="text-app-15 font-semibold text-foreground hover:underline">{name}</Link>
          <span className="text-app-13 text-muted-foreground">{decision.rider_id}</span>
          <StatusPill tone={STATUS_TONE[decision.status] ?? 'attention'}>{STATUS_LABEL[decision.status] ?? decision.status}</StatusPill>
        </div>
        <span className="text-app-13 text-muted-foreground">
          {whenText(decision.started_at ?? decision.decided_at)}{count > 1 ? ` · ${count} flagged sessions` : ''}
        </span>
      </div>

      <p className="mt-2 text-app-sm text-foreground">{summary}</p>
      {bullets.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-app-sm text-muted-foreground">
          {bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}
      <p className="mt-2 text-app-13 text-muted-foreground">
        This is a reason to take a closer look, not proof that the account is being shared.
      </p>

      {error && <Alert tone="error" className="mt-3">{error}</Alert>}

      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="Add a note (optional)"
          aria-label={`Note for ${name}`}
          className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-app-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        {confirming === null ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirming('clear')}>Clear account</Button>
            <Button variant="danger" onClick={() => setConfirming('suspend')}>Suspend account</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2" role="group" aria-label="Confirm">
            <span className="text-app-sm text-muted-foreground">{confirming === 'clear' ? 'Clear this account?' : 'Suspend this account?'}</span>
            <Button variant={confirming === 'clear' ? 'primary' : 'danger'} loading={busy} onClick={() => void decide(confirming)}>Yes</Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>Cancel</Button>
          </div>
        )}
      </div>
    </li>
  )
}

export const NeedsReviewPage: React.FC = () => {
  const { changeTick, refresh } = useOps()
  const [decisions, setDecisions] = useState<Decision[] | null>(null)
  const [requests, setRequests] = useState<TeamRequest[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const load = useCallback(async () => {
    try {
      const [list, reqs] = await Promise.all([ops.decisions({ unreviewed: true, min_level: 2, limit: 300 }), ops.requests({ status: 'active' })])
      setDecisions(list)
      setRequests(reqs)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => { void load() }, [load, changeTick])

  // one case per rider: the newest flagged session stands for the rest
  const cases = useMemo(() => {
    const byRider = new Map<string, { decision: Decision; count: number }>()
    for (const d of decisions ?? []) {
      const existing = byRider.get(d.rider_id)
      byRider.set(d.rider_id, { decision: existing?.decision ?? d, count: (existing?.count ?? 0) + 1 })
    }
    return [...byRider.values()]
  }, [decisions])

  if (decisions === null && !error) return <Spinner label="Loading cases" />

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-app-sm text-muted-foreground">
        Accounts where the way the account is being used has changed. Look at the evidence, then clear the account or suspend it.
      </p>
      {done && <Alert tone="success">{done}</Alert>}
      {error && <Alert tone="error">{error} <button className="underline" onClick={() => void load()}>Try again</button></Alert>}
      {decisions !== null && cases.length === 0 && (
        <div className="rounded-xl border border-border bg-card"><EmptyState title="No cases need your attention right now.">New cases appear here as soon as one is raised.</EmptyState></div>
      )}
      <ul className="space-y-3">
        {cases.map(({ decision, count }) => (
          <CaseCard
            key={decision.rider_id}
            decision={decision}
            count={count}
            onDone={(message) => { setDone(message); void load(); refresh() }}
          />
        ))}
      </ul>

      <div className="pt-2">
        <h2 className="text-app-15 font-semibold text-foreground">Rider requests</h2>
        <p className="text-app-sm text-muted-foreground">Riders asking for help, a review, or telling us about a new phone.</p>
      </div>
      {requests.length === 0 ? (
        <div className="rounded-xl border border-border bg-card"><EmptyState title="No requests waiting.">Requests from riders appear here.</EmptyState></div>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} onChanged={(message) => { setDone(message); void load(); refresh() }} />
          ))}
        </ul>
      )}
    </div>
  )
}
