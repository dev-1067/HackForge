import React from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { ChartDataPoint } from '@/types'
import { useTheme } from '@/hooks/useTheme'

interface DeviationEvidenceChartProps {
  data: ChartDataPoint[]
  height?: number
  className?: string
}

export const DeviationEvidenceChart: React.FC<DeviationEvidenceChartProps> = ({
  data,
  height = 200,
  className,
}) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)'
  const textColor = isDark ? '#94A3B8' : '#64748B'

  // Format decimal as percentage for axis
  const formatPercent = (val: number) => `${Math.round(val * 100)}%`

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span className="text-muted-foreground">Habit Deviation (Instant)</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span className="text-muted-foreground">Accumulated Evidence (Multi-Session)</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-2.5 h-0.5 bg-rose-500" />
            <span className="text-muted-foreground">Escalation Threshold (0.60)</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="evidenceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />

            <XAxis
              dataKey="time"
              stroke={textColor}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />

            <YAxis
              stroke={textColor}
              fontSize={11}
              tickFormatter={formatPercent}
              domain={[0, 1]}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
            />

            {/* Threshold Line for L2 Step-up trigger */}
            <ReferenceLine
              y={0.6}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const currentPoint = payload[0].payload as ChartDataPoint
                  return (
                    <div className="bg-card border border-border p-2.5 rounded-md shadow-lg font-mono text-xs space-y-1 z-50">
                      <div className="font-semibold text-foreground border-b border-border/60 pb-1 flex justify-between gap-4">
                        <span>Window: {label}</span>
                        <span className="text-blue-500 font-bold">{currentPoint.decisionLevel}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-amber-500">
                        <span>Habit Deviation:</span>
                        <span className="font-bold">{formatPercent(currentPoint.habitDeviation)}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-blue-500">
                        <span>Accumulated Evidence:</span>
                        <span className="font-bold">{formatPercent(currentPoint.evidenceAccumulated)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground pt-0.5">
                        Session: {currentPoint.sessionId}
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />

            {/* Evidence Area */}
            <Area
              type="monotone"
              dataKey="evidenceAccumulated"
              name="Accumulated Evidence"
              fill="url(#evidenceFill)"
              stroke="#3B82F6"
              strokeWidth={2}
            />

            {/* Instant Deviation Line */}
            <Line
              type="monotone"
              dataKey="habitDeviation"
              name="Habit Deviation"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ r: 3, fill: '#F59E0B', strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: '#F59E0B', strokeWidth: 2, fill: '#1E293B' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
