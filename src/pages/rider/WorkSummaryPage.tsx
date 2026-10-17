import React, { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { rider } from '@/api/endpoints'
import { Panel } from '@/components/app/Panel'
import { SelectFilter } from '@/components/app/FilterBar'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { parseUtc } from '@/lib/plain'
import type { WorkSummary } from '@/types/api'

const Stat: React.FC<{ label: string; value: string | number; note?: string }> = ({ label, value, note }) => (
  <div className="px-4 py-3">
    <p className="text-app-13 text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-app-2xl font-semibold tracking-tight text-foreground">{value}</p>
    {note && <p className="text-app-13 text-muted-foreground">{note}</p>}
  </div>
)

const day = (d: Date) => d.toLocaleDateString([], { day: 'numeric', month: 'short' })

/** The rider's own working pattern: sessions per day and per hour, where they worked. Their own data only. */
export const WorkSummaryPage: React.FC = () => {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<WorkSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setData(null)
    rider.summary(days).then((d) => { if (live) { setData(d); setError('') } }).catch((e) => { if (live) setError((e as Error).message) })
    return () => { live = false }
  }, [days])

  const perDay = useMemo(() => {
    if (!data?.period.to) return []
    const end = parseUtc(data.period.to)
    end.setHours(0, 0, 0, 0)
    const counts = new Map<string, number>()
    for (const s of data.sessions) { const k = parseUtc(s.at).toDateString(); counts.set(k, (counts.get(k) ?? 0) + 1) }
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(end); d.setDate(end.getDate() - (days - 1 - i))
      return { label: day(d), sessions: counts.get(d.toDateString()) ?? 0 }
    })
  }, [data, days])

  const perHour = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ label: `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`, sessions: 0 }))
    for (const s of data?.sessions ?? []) hours[parseUtc(s.at).getHours()].sessions += 1
    return hours
  }, [data])

  const busiest = useMemo(() => [...perHour].sort((a, b) => b.sessions - a.sessions)[0], [perHour])

  if (!data && !error) return <Spinner label="Loading your work summary" />
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-app-sm text-muted-foreground">
          How and where you have worked. This is your own activity. It does not affect your account.
        </p>
        <SelectFilter label="Period" value={String(days)} onChange={(v) => setDays(Number(v))}
          options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }]} />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {data && data.totals.sessions === 0 ? (
        <div className="rounded-xl border border-border bg-card"><EmptyState title="No activity yet.">Your sessions appear here after your first deliveries.</EmptyState></div>
      ) : data && (
        <>
          {data.period.to && (
            <p className="text-app-13 text-muted-foreground">
              Up to your latest session on {parseUtc(data.period.to).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}.
              {data.includes_demo && ' Includes simulated demo activity.'}
            </p>
          )}
          <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4 lg:divide-y-0">
            <Stat label="Sessions" value={data.totals.sessions.toLocaleString()} note={`${data.all_time.sessions.toLocaleString()} in total`} />
            <Stat label="Days you worked" value={data.totals.active_days} note={`of ${days}`} />
            <Stat label="Cities" value={data.totals.cities.length} />
            <Stat label="Phones used" value={data.totals.phones} note="A new phone is normal" />
          </div>

          <Panel title="Sessions each day" note="Times use your own time zone.">
            <div className="h-56" role="img" aria-label="Bar chart of sessions per day">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval={Math.max(0, Math.floor(days / 7) - 1)} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="sessions" name="Sessions" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Your usual hours" note={busiest?.sessions ? `You are busiest around ${busiest.label}.` : undefined}>
              <div className="h-44" role="img" aria-label="Bar chart of sessions by hour of the day">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perHour} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={2} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
                    <Bar dataKey="sessions" name="Sessions" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Where you worked">
              <ul className="space-y-2">
                {data.totals.cities.map((c) => (
                  <li key={c.city}>
                    <div className="flex justify-between text-app-sm"><span className="text-foreground">{c.city}</span><span className="text-muted-foreground">{c.sessions} session{c.sessions === 1 ? '' : 's'}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${(c.sessions / data.totals.sessions) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-app-13 text-muted-foreground">Working in a new city is normal and does not put your account at risk on its own.</p>
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
