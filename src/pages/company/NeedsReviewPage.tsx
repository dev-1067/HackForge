import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ops } from '@/api/endpoints'
import { useOps } from '@/components/app/OpsContext'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/StatusPill'
import { ActiveFilters, SearchInput, SelectFilter, useDebounced, type ActiveFilter } from '@/components/app/FilterBar'
import { LEVEL_LABEL, STATUS_LABEL, STATUS_TONE, explain, fullTime, whenText } from '@/lib/plain'
import { RANGES, rangeSince, type RangeKey } from '@/lib/ranges'
import type { Decision, FilterOptions, Level, TeamRequest } from '@/types/api'
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
      {decision.awaiting_rider_since && (
        <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-1.5 text-app-sm text-foreground">
          Waiting for the rider to confirm since {whenText(decision.awaiting_rider_since)}. If there is no answer the account is put on hold for a person to decide.
        </p>
      )}
      <p className="mt-2 text-app-13 text-muted-foreground">
        This is a reason to take a closer look, not proof that the account is being shared.{' '}
        <Link to={`/sessions/decision/${decision.decision_id}`} className="font-medium text-foreground underline underline-offset-2">View the session</Link>
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

const VERDICT: Record<string, string> = {
  dismissed: 'Cleared', confirmed_takeover: 'Suspended', rider_verified: 'Rider confirmed it was them',
}

const ClosedRow: React.FC<{ decision: Decision }> = ({ decision }) => {
  const name = decision.rider_name ?? `Rider ${decision.rider_id}`
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-app-sm">
      <div className="min-w-0">
        <Link to={`/riders/${encodeURIComponent(decision.rider_id)}`} className="font-medium text-foreground hover:underline">{name}</Link>
        <span className="ml-2 text-app-13 text-muted-foreground">{decision.rider_id}</span>
        <p className="text-muted-foreground">
          {VERDICT[decision.review_verdict ?? ''] ?? decision.review_verdict}
          {decision.reviewed_by && decision.reviewed_by !== 'rider' ? ` by ${decision.reviewed_by}` : ''}
          {decision.reviewed_at ? ` · ${fullTime(decision.reviewed_at)}` : ''}
        </p>
      </div>
      <Link to={`/sessions/decision/${decision.decision_id}`} className="text-app-13 text-muted-foreground underline underline-offset-2">
        {LEVEL_LABEL[decision.level]} · {whenText(decision.started_at ?? decision.decided_at)}
      </Link>
    </li>
  )
}

const SEVERITY = [{ value: '', label: 'Any severity' }, ...(['L2', 'L3', 'L4'] as Level[]).map((l) => ({ value: l, label: LEVEL_LABEL[l] }))]
const STATE = [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }, { value: 'all', label: 'Pending and completed' }]

export const NeedsReviewPage: React.FC = () => {
  const { changeTick, refresh } = useOps()
  const [decisions, setDecisions] = useState<Decision[] | null>(null)
  const [requests, setRequests] = useState<TeamRequest[]>([])
  const [options, setOptions] = useState<FilterOptions | null>(null)
  const [query, setQuery] = useState('')
  const [state, setState] = useState('pending')
  const [severity, setSeverity] = useState('')
  const [city, setCity] = useState('')
  const [range, setRange] = useState<RangeKey>('all')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const q = useDebounced(query.trim())

  useEffect(() => { ops.filters().then(setOptions).catch(() => setOptions(null)) }, [])

  const load = useCallback(async () => {
    try {
      const filters = { q, level: severity, city, since: rangeSince(range), limit: 300 }
      const [list, reqs] = await Promise.all([
        ops.decisions(state === 'all' ? { ...filters, min_level: 2 } : { ...filters, case_status: state }),
        ops.requests({ status: 'active' }),
      ])
      setDecisions(list)
      setRequests(reqs)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [q, state, severity, city, range])

  useEffect(() => { void load() }, [load, changeTick])

  // one case per rider: the newest flagged session stands for the rest
  const { cases, closed } = useMemo(() => {
    const byRider = new Map<string, { decision: Decision; count: number }>()
    const closedList: Decision[] = []
    for (const d of decisions ?? []) {
      if (d.review_verdict) { closedList.push(d); continue }
      const existing = byRider.get(d.rider_id)
      byRider.set(d.rider_id, { decision: existing?.decision ?? d, count: (existing?.count ?? 0) + 1 })
    }
    return { cases: [...byRider.values()], closed: closedList }
  }, [decisions])

  const visibleRequests = useMemo(() => {
    const t = q.toLowerCase()
    return t ? requests.filter((r) => `${r.rider_id} ${r.rider_name ?? ''}`.toLowerCase().includes(t)) : requests
  }, [requests, q])

  const active: ActiveFilter[] = [
    query.trim() && { key: 'q', label: `Search: ${query.trim()}`, clear: () => setQuery('') },
    state !== 'pending' && { key: 'st', label: STATE.find((o) => o.value === state)!.label, clear: () => setState('pending') },
    severity && { key: 'sv', label: LEVEL_LABEL[severity as Level], clear: () => setSeverity('') },
    city && { key: 'c', label: city, clear: () => setCity('') },
    range !== 'all' && { key: 'd', label: RANGES.find((r) => r.value === range)!.label, clear: () => setRange('all') },
  ].filter(Boolean) as ActiveFilter[]
  const clearAll = () => { setQuery(''); setState('pending'); setSeverity(''); setCity(''); setRange('all') }

  if (decisions === null && !error) return <Spinner label="Loading cases" />

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-app-sm text-muted-foreground">
        Accounts where the way the account is being used has changed. Look at the evidence, then clear the account or suspend it.
      </p>

      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
        <SearchInput value={query} onChange={setQuery} label="Search cases" placeholder="Search by rider name or ID" className="lg:w-72" />
        <SelectFilter label="Case status" value={state} onChange={setState} options={STATE} />
        <SelectFilter label="Severity" value={severity} onChange={setSeverity} options={SEVERITY} />
        <SelectFilter label="City" value={city} onChange={setCity} options={[{ value: '', label: 'All cities' }, ...(options?.cities ?? []).map((c) => ({ value: c, label: c }))]} />
        <SelectFilter label="Date range" value={range} onChange={(v) => setRange(v as RangeKey)} options={RANGES} />
      </div>
      <ActiveFilters filters={active} onClearAll={clearAll} />

      {done && <Alert tone="success">{done}</Alert>}
      {error && <Alert tone="error">{error} <button className="underline" onClick={() => void load()}>Try again</button></Alert>}
      {decisions !== null && cases.length === 0 && closed.length === 0 && (
        <div className="rounded-xl border border-border bg-card">
          {active.length > 0
            ? <EmptyState title="No cases match these filters.">Try fewer filters or a wider date range. <button onClick={clearAll} className="font-medium underline">Clear all filters</button></EmptyState>
            : <EmptyState title="No cases need your attention right now.">New cases appear here as soon as one is raised.</EmptyState>}
        </div>
      )}
      {cases.length > 0 && (
        <h2 className="text-app-15 font-semibold text-foreground">Cases waiting ({cases.length})</h2>
      )}
      {cases.length > 0 && (
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
      )}
      {closed.length > 0 && (
        <div>
          <h2 className="mb-2 text-app-15 font-semibold text-foreground">Completed cases</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {closed.slice(0, 100).map((d) => <ClosedRow key={d.decision_id} decision={d} />)}
          </ul>
          {closed.length > 100 && <p className="mt-2 text-app-13 text-muted-foreground">Showing the newest 100. Narrow the date range to see others.</p>}
        </div>
      )}

      {state !== 'completed' && (
        <>
          <div className="pt-2">
            <h2 className="text-app-15 font-semibold text-foreground">Rider requests ({visibleRequests.length})</h2>
            <p className="text-app-sm text-muted-foreground">Riders asking for help, a review, or telling us about a new phone.</p>
          </div>
          {visibleRequests.length === 0 ? (
            <div className="rounded-xl border border-border bg-card"><EmptyState title={q ? 'No requests match this search.' : 'No requests waiting.'}>Requests from riders appear here.</EmptyState></div>
          ) : (
            <ul className="space-y-3">
              {visibleRequests.map((r) => (
                <RequestCard key={r.id} request={r} onChanged={(message) => { setDone(message); void load(); refresh() }} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
