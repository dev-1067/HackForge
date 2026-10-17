import React, { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ops } from '@/api/endpoints'
import { Panel } from '@/components/app/Panel'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { useTheme } from '@/hooks/useTheme'
import { pct } from '@/lib/plain'
import type { CompareData } from '@/types/api'

const NAMES: Record<keyof CompareData['systems'], { name: string; text: string }> = {
  trust_juggler: { name: 'Trust Juggler', text: 'Looks at how the account is used, not only where.' },
  naive_anomaly: { name: 'Simple alert', text: 'Flags anything unusual, with no sense of context.' },
  strict_gate: { name: 'Strict gate', text: 'Asks for a check whenever the phone or city changes.' },
  open_gate: { name: 'Open gate', text: 'Trusts the first check forever.' },
}

export const ComparePage: React.FC = () => {
  const { theme } = useTheme()
  const [data, setData] = useState<CompareData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ops.compare().then(setData).catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <Alert tone="error">{error}</Alert>
  if (!data) return <Spinner label="Loading the comparison" />

  const dark = theme === 'dark'
  const axis = dark ? '#94A3B8' : '#64748B'
  const grid = dark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.18)'
  const keys = Object.keys(NAMES) as Array<keyof CompareData['systems']>
  const bars = keys.map((k) => ({
    name: NAMES[k].name,
    caught: Math.round(data.systems[k].takeover_recall_14d * 1000) / 10,
    bothered: Math.round(data.systems[k].false_stepup_rate * 10000) / 100,
  }))
  const curve = data.tradeoff_curve.map((p) => ({
    bothered: Math.round(p.false_stepup_rate * 10000) / 100,
    caught: Math.round(p.takeover_recall_14d * 1000) / 10,
  }))

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Four ways to protect accounts, tested on the same simulated riders that the system had never seen before.
        A good approach catches account sharing without bothering genuine riders.
      </p>

      <Panel title="Results" flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[13px] text-muted-foreground">
                <th className="px-4 py-2 font-medium">Approach</th>
                <th className="px-4 py-2 font-medium">Account sharing caught</th>
                <th className="px-4 py-2 font-medium">Genuine sessions asked for a check</th>
                <th className="px-4 py-2 font-medium">Sessions until noticed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.map((k) => {
                const s = data.systems[k]
                return (
                  <tr key={k} className={k === 'trust_juggler' ? 'bg-secondary/40' : ''}>
                    <td className="px-4 py-2"><span className="font-medium text-foreground">{NAMES[k].name}</span><span className="block text-[13px] text-muted-foreground">{NAMES[k].text}</span></td>
                    <td className="px-4 py-2 font-medium">{pct(s.takeover_recall_14d)}</td>
                    <td className="px-4 py-2 font-medium">{pct(s.false_stepup_rate, 2)}</td>
                    <td className="px-4 py-2">{s.detection_latency_sessions.median ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Caught vs bothered" note="Higher green and lower amber is better.">
          <div style={{ height: 220 }} role="img" aria-label="Bar chart comparing the four approaches">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axis, fontSize: 12 }} tickLine={false} axisLine={{ stroke: grid }} />
                <YAxis tick={{ fill: axis, fontSize: 12 }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="caught" name="Account sharing caught" fill={dark ? '#34D399' : '#0F3B2C'} isAnimationActive={false} />
                <Bar dataKey="bothered" name="Genuine sessions checked" fill="#D97706" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Turning the dial" note="Asking for fewer checks catches less; asking for more catches more.">
          <div style={{ height: 220 }} role="img" aria-label="Line chart of the trade-off">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curve} margin={{ top: 8, right: 8, left: -12, bottom: 16 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="bothered" type="number" domain={[0, 'dataMax']} unit="%" tick={{ fill: axis, fontSize: 12 }} tickLine={false}
                  axisLine={{ stroke: grid }} label={{ value: 'Genuine sessions asked for a check', position: 'insideBottom', offset: -10, fill: axis, fontSize: 12 }} />
                <YAxis tick={{ fill: axis, fontSize: 12 }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v) => `${v}%`} labelFormatter={(l) => `${l}% asked for a check`} />
                <Line type="monotone" dataKey="caught" name="Account sharing caught" stroke={dark ? '#34D399' : '#0F3B2C'} strokeWidth={2} dot isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <p className="text-[13px] text-muted-foreground">Results come from simulated riders, not real accounts.</p>
    </div>
  )
}
