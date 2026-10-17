import React from 'react'
import { cn } from '@/lib/utils'

interface EvidenceGaugeProps {
  contextNovelty: number // 0.0 - 1.0
  habitDeviation: number // 0.0 - 1.0
  evidenceScore: number  // 0.0 - 1.0
  compact?: boolean
  className?: string
}

export const EvidenceGauge: React.FC<EvidenceGaugeProps> = ({
  contextNovelty,
  habitDeviation,
  evidenceScore,
  compact = false,
  className,
}) => {
  const formatPercent = (val: number) => `${Math.round(val * 100)}%`

  // Context color: blue/indigo (life events are benign)
  const getContextColor = (val: number) => {
    if (val > 0.6) return 'bg-indigo-500'
    if (val > 0.3) return 'bg-sky-500'
    return 'bg-slate-400 dark:bg-slate-500'
  }

  // Habit color: amber to rose (habit divergence is acute risk)
  const getHabitColor = (val: number) => {
    if (val >= 0.7) return 'bg-rose-500'
    if (val >= 0.4) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  // Evidence accumulator
  const getEvidenceColor = (val: number) => {
    if (val >= 0.7) return 'bg-rose-600'
    if (val >= 0.4) return 'bg-amber-500'
    return 'bg-blue-500'
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 font-mono text-xs', className)}>
        <div className="flex items-center gap-1.5" title="Context Novelty">
          <span className="text-[10px] text-muted-foreground uppercase">Ctx:</span>
          <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', getContextColor(contextNovelty))}
              style={{ width: `${Math.min(100, Math.max(0, contextNovelty * 100))}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold">{formatPercent(contextNovelty)}</span>
        </div>

        <div className="flex items-center gap-1.5" title="Habit Deviation">
          <span className="text-[10px] text-muted-foreground uppercase">Hab:</span>
          <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', getHabitColor(habitDeviation))}
              style={{ width: `${Math.min(100, Math.max(0, habitDeviation * 100))}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold">{formatPercent(habitDeviation)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2 text-xs font-mono', className)}>
      <div>
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            Context Novelty (Hardware/City/IP)
          </span>
          <span className="font-semibold">{formatPercent(contextNovelty)}</span>
        </div>
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', getContextColor(contextNovelty))}
            style={{ width: `${Math.min(100, Math.max(0, contextNovelty * 100))}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Habit Deviation (Cadence/Latency/Speed)
          </span>
          <span className="font-semibold">{formatPercent(habitDeviation)}</span>
        </div>
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', getHabitColor(habitDeviation))}
            style={{ width: `${Math.min(100, Math.max(0, habitDeviation * 100))}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            Accumulated Multi-Session Evidence
          </span>
          <span className="font-semibold">{formatPercent(evidenceScore)}</span>
        </div>
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', getEvidenceColor(evidenceScore))}
            style={{ width: `${Math.min(100, Math.max(0, evidenceScore * 100))}%` }}
          />
        </div>
      </div>
    </div>
  )
}
