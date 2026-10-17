import React from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTheme } from '@/hooks/useTheme'

export interface TrendPoint {
  label: string
  change: number
  line: number
  note?: boolean
  detail?: string
}

/** How different recent activity is from usual, against the point where an extra check is asked for. */
export const TrendChart: React.FC<{ data: TrendPoint[]; height?: number }> = ({ data, height = 190 }) => {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const axis = dark ? '#94A3B8' : '#64748B'
  const grid = dark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.18)'
  const line = data.length ? data[data.length - 1].line : 0
  const top = Math.max(line * 1.6, ...data.map((p) => p.change), 1)

  if (data.length < 2) {
    return <p className="py-10 text-center text-app-sm text-muted-foreground">More activity is needed before a trend can be drawn.</p>
  }
  return (
    <div style={{ height }} role="img" aria-label="Chart of how different recent activity is from usual">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: axis, fontSize: 12 }} tickLine={false} axisLine={{ stroke: grid }} minTickGap={32} />
          <YAxis tick={{ fill: axis, fontSize: 12 }} tickLine={false} axisLine={false} domain={[0, top]} width={48}
            tickFormatter={(v: number) => (v === 0 ? 'Usual' : '')} />
          <ReferenceLine y={line} stroke="#D97706" strokeDasharray="5 4"
            label={{ value: 'Extra check', position: 'insideTopRight', fill: '#D97706', fontSize: 12 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as TrendPoint
              return (
                <div className="rounded-lg border border-border bg-card px-3 py-2 text-app-13 shadow-sm">
                  <div className="font-medium text-foreground">{p.label}</div>
                  {p.detail && <div className="text-muted-foreground">{p.detail}</div>}
                </div>
              )
            }}
          />
          <Line type="monotone" dataKey="change" stroke={dark ? '#34D399' : '#0F3B2C'} strokeWidth={2} isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; payload?: TrendPoint; index?: number }) => {
              const { cx, cy, payload, index } = props
              if (cx === undefined || cy === undefined) return <g key={index} />
              return payload?.note
                ? <circle key={index} cx={cx} cy={cy} r={4} fill="#2563EB" stroke="none" />
                : <circle key={index} cx={cx} cy={cy} r={0} />
            }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
