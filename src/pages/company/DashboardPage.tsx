import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOps } from '@/components/app/OpsContext'
import { Panel } from '@/components/app/Panel'
import { DecisionTable } from '@/components/app/DecisionTable'
import { TrendChart, type TrendPoint } from '@/components/app/TrendChart'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { pct, whenText, explain, describeFlags, STATUS_LABEL } from '@/lib/plain'
import type { Decision } from '@/types/api'

const Stat: React.FC<{ label: string; value: string | number; note?: string }> = ({ label, value, note }) => (
  <div className="px-4 py-3">
    <p className="text-[13px] text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    {note && <p className="text-[13px] text-muted-foreground">{note}</p>}
  </div>
)

export const DashboardPage: React.FC = () => {
  const { summary, recent } = useOps()
  const [filter, setFilter] = useState<'all' | 'attention'>('all')
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return recent.filter((d) => {
      if (filter === 'attention' && (d.level === 'L0' || d.level === 'L1')) return false
      if (!q) return true
      return [d.rider_id, d.rider_name, d.context?.city, d.context?.zone].some((v) => v?.toLowerCase().includes(q))
    })
  }, [recent, filter, search])

  const cases = useMemo(() => {
    const seen = new Set<string>()
    const out: Decision[] = []
    for (const d of recent) {
      if (d.level === 'L0' || d.level === 'L1' || d.review_verdict || seen.has(d.rider_id)) continue
      seen.add(d.rider_id)
      out.push(d)
    }
    return out.slice(0, 4)
  }, [recent])

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
        <Stat label="Sessions checked" value={summary.sessions_scored.toLocaleString()} />
        <Stat label="Cases to review" value={summary.open_cases} note={summary.open_cases === 0 ? 'All clear' : undefined} />
        <Stat label="Accounts being watched" value={summary.accounts_under_watch} />
        <Stat label="Extra checks asked" value={pct(summary.stepup_rate)} note="of all sessions" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Activity compared with usual" note="Blue dots mark a new phone or place." className="lg:col-span-2">
          <TrendChart data={chart} />
        </Panel>

        <Panel
          title="Needs review"
          action={<Link to="/review-queue" className="text-[13px] font-medium text-foreground underline underline-offset-2">See all</Link>}
          flush
        >
          {cases.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No cases need your attention right now.</p>
          ) : (
            <ul className="divide-y divide-border">
              {cases.map((d) => (
                <li key={d.decision_id}>
                  <Link to="/review-queue" className="block px-4 py-2.5 hover:bg-secondary/40 focus:outline-none focus-visible:bg-secondary/40">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{d.rider_name ?? `Rider ${d.rider_id}`}</span>
                      <span className="text-[13px] text-muted-foreground">{whenText(d.started_at ?? d.decided_at)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{explain(d).summary}</p>
                    <p className="mt-0.5 text-[13px] font-medium text-foreground">{STATUS_LABEL[d.status] ?? d.status}</p>
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
            <div role="group" aria-label="Filter sessions" className="inline-flex overflow-hidden rounded-lg border border-border text-[13px]">
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
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rider or city"
              aria-label="Search sessions"
              className="hidden w-48 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40 sm:block"
            />
          </div>
        }
      >
        <DecisionTable
          decisions={rows.slice(0, 15)}
          emptyText={filter === 'attention' || search ? 'Nothing matches. Try clearing the filter.' : undefined}
        />
      </Panel>
    </div>
  )
}
