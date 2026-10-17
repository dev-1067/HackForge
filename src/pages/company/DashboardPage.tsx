import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ops } from '@/api/endpoints'
import { CountUp } from '@/components/app/CountUp'
import { SelectFilter, useDebounced } from '@/components/app/FilterBar'
import { RANGES, rangeSince, type RangeKey } from '@/lib/ranges'
import { useOps } from '@/components/app/OpsContext'
import { Panel } from '@/components/app/Panel'
import { DecisionTable } from '@/components/app/DecisionTable'
import { TrendChart, type TrendPoint } from '@/components/app/TrendChart'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { LEVEL_LABEL, pct, whenText, explain, describeFlags, STATUS_LABEL } from '@/lib/plain'
import type { Decision, Level, MetricsSummary } from '@/types/api'

const Stat: React.FC<{ label: string; value: number; format?: (n: number) => string; note?: string }> = ({ label, value, format, note }) => (
  <div className="px-4 py-3">
    <p className="text-app-13 text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-app-2xl font-semibold tracking-tight text-foreground"><CountUp value={value} format={format} /></p>
    {note && <p className="text-app-13 text-muted-foreground">{note}</p>}
  </div>
)

/** The point of the product in three numbers, measured against the simulator's ground truth. */
const Fairness: React.FC<{ sim: MetricsSummary['simulation'] }> = ({ sim }) => {
  if (!sim || sim.honest_sessions === 0) return null
  const caught = sim.impostor_accounts ? `${sim.impostor_accounts_flagged} of ${sim.impostor_accounts}` : '—'
  return (
    <Panel title="Fair to honest riders, firm on takeovers" note="Measured on simulated riders, where we know who was really riding.">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div><dt className="text-app-13 text-muted-foreground">Honest sessions left alone</dt>
          <dd className="text-app-xl font-semibold text-foreground">{pct(1 - sim.false_stepup_rate, 1)}</dd></div>
        <div><dt className="text-app-13 text-muted-foreground">Staged takeovers caught</dt>
          <dd className="text-app-xl font-semibold text-foreground">{caught}</dd></div>
        <div><dt className="text-app-13 text-muted-foreground">Sessions until a takeover is noticed</dt>
          <dd className="text-app-xl font-semibold text-foreground">{sim.median_sessions_to_detect ?? '—'}<span className="ml-1 text-app-13 font-normal text-muted-foreground">typical</span></dd></div>
      </dl>
    </Panel>
  )
}

const MIX: Array<[Level, string]> = [['L0', 'bg-emerald-500'], ['L1', 'bg-sky-500'], ['L2', 'bg-amber-500'], ['L3', 'bg-rose-500'], ['L4', 'bg-rose-800']]

/** How every checked session ended up, as one bar. Most are normal, which is the point. */
const OutcomeMix: React.FC<{ counts: Record<Level, number>; total: number }> = ({ counts, total }) => {
  if (total === 0) return null
  return (
    <Panel title="How sessions ended up" note="Most sessions are normal. Only a small share needs a closer look.">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary" role="img"
        aria-label={MIX.map(([l]) => `${LEVEL_LABEL[l]} ${counts[l] ?? 0}`).join(', ')}>
        {MIX.map(([level, color]) => counts[level] > 0 && (
          <div key={level} className={cn(color, 'transition-[width] duration-700')} style={{ width: `${Math.max((counts[level] / total) * 100, 0.8)}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-app-13 text-muted-foreground">
        {MIX.map(([level, color]) => (
          <li key={level} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-full', color)} aria-hidden />
            {LEVEL_LABEL[level]} <span className="font-medium text-foreground">{(counts[level] ?? 0).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export const DashboardPage: React.FC = () => {
  const { summary, recent, changeTick } = useOps()
  const [filter, setFilter] = useState<'all' | 'attention'>('all')
  const [search, setSearch] = useState('')

  const [range, setRange] = useState<'live' | RangeKey>('live')
  const [history, setHistory] = useState<Decision[] | null>(null)
  const [historyError, setHistoryError] = useState('')
  const q = useDebounced(search.trim())

  // A date range reads the stored sessions, so it is not limited to what has streamed in since the page opened.
  useEffect(() => {
    if (range === 'live') { setHistory(null); return }
    let live = true
    setHistory(null); setHistoryError('')
    ops.decisions({ since: rangeSince(range), q, min_level: filter === 'attention' ? 2 : undefined, limit: 15 })
      .then((rows) => { if (live) setHistory(rows) })
      .catch((e) => { if (live) setHistoryError((e as Error).message) })
    return () => { live = false }
  }, [range, q, filter])

  const rows = useMemo(() => {
    if (range !== 'live') return history ?? []
    const q = search.trim().toLowerCase()
    return recent.filter((d) => {
      if (filter === 'attention' && (d.level === 'L0' || d.level === 'L1')) return false
      if (!q) return true
      return [d.rider_id, d.rider_name, d.context?.city, d.context?.zone].some((v) => v?.toLowerCase().includes(q))
    })
  }, [recent, filter, search, range, history])

  // Open cases come from the server, not from the short live feed, so they stay until a person decides.
  const [pending, setPending] = useState<Decision[]>([])
  useEffect(() => {
    let live = true
    ops.decisions({ case_status: 'pending', limit: 200 }).then((rows) => { if (live) setPending(rows) }).catch(() => undefined)
    return () => { live = false }
  }, [changeTick])
  const cases = useMemo(() => {
    const seen = new Set<string>()
    const out: Decision[] = []
    for (const d of pending) {
      if (seen.has(d.rider_id)) continue
      seen.add(d.rider_id)
      out.push(d)
    }
    return out
  }, [pending])

  const chart: TrendPoint[] = useMemo(() =>
    [...recent].reverse().slice(-40).map((d) => ({
      label: new Date(d.decided_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      change: d.evidence_score,
      line: d.threshold,
      note: d.context_flags.some((f) => f === 'new_device' || f === 'new_city'),
      detail: `${d.rider_name ?? `Rider ${d.rider_id}`}${d.context_flags.length ? ` · ${describeFlags(d.context_flags)}` : ''}`,
    })), [recent])

  if (!summary) return <Spinner label="Loading the dashboard" />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4 lg:divide-y-0">
        <Stat label="Sessions checked" value={summary.sessions_scored} />
        <Stat label="Cases to review" value={summary.open_cases} note={summary.open_cases === 0 ? 'All clear' : undefined} />
        <Stat label="Accounts being watched" value={summary.accounts_under_watch} />
        <Stat label="Extra checks asked" value={summary.stepup_rate} format={(n) => pct(n)} note="of all sessions" />
      </div>

      <Fairness sim={summary.simulation} />

      <OutcomeMix counts={summary.level_counts} total={summary.sessions_scored} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Activity compared with usual" note="Blue dots mark a new phone or place." className="lg:col-span-2">
          <TrendChart data={chart} />
        </Panel>

        <Panel
          title={`Needs review${cases.length ? ` (${cases.length})` : ''}`}
          action={<Link to="/review-queue" className="text-app-13 font-medium text-foreground underline underline-offset-2">See all</Link>}
          flush
        >
          {cases.length === 0 ? (
            <p className="px-4 py-8 text-center text-app-sm text-muted-foreground">No cases need your attention right now.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {cases.map((d) => (
                <li key={d.decision_id}>
                  <Link to="/review-queue" className="block px-4 py-2.5 hover:bg-secondary/40 focus:outline-none focus-visible:bg-secondary/40">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-app-sm font-medium text-foreground">{d.rider_name ?? `Rider ${d.rider_id}`}</span>
                      <span className="text-app-13 text-muted-foreground">{whenText(d.started_at ?? d.decided_at)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-app-13 text-muted-foreground">{explain(d).summary}</p>
                    <p className="mt-0.5 text-app-13 font-medium text-foreground">{STATUS_LABEL[d.status] ?? d.status}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Recent sessions"
        flush
        action={
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Filter sessions" className="inline-flex overflow-hidden rounded-lg border border-border text-app-13">
              {(['all', 'attention'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={cn('px-3 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    filter === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}
                >
                  {key === 'all' ? 'All' : 'Needs attention'}
                </button>
              ))}
            </div>
            <SelectFilter label="Date range" value={range} onChange={(v) => setRange(v as 'live' | RangeKey)}
              options={[{ value: 'live', label: 'Live' }, ...RANGES]} className="py-1.5 text-app-13" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rider or city"
              aria-label="Search sessions"
              className="hidden w-48 rounded-lg border border-border bg-card px-3 py-1.5 text-app-13 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40 sm:block"
            />
          </div>
        }
      >
        {historyError && <p role="alert" className="px-4 py-3 text-app-sm text-rose-700 dark:text-rose-400">{historyError}</p>}
        {range !== 'live' && history === null && !historyError ? (
          <div className="p-6"><Spinner label="Loading sessions" /></div>
        ) : (
          <DecisionTable
            decisions={rows.slice(0, 15)}
            emptyText={filter === 'attention' || search || range !== 'live' ? 'Nothing matches. Try a wider date range or clear a filter.' : undefined}
          />
        )}
        <div className="border-t border-border px-4 py-2 text-right text-app-13">
          <Link to="/sessions" className="font-medium text-foreground underline underline-offset-2">Search all sessions</Link>
        </div>
      </Panel>
    </div>
  )
}
