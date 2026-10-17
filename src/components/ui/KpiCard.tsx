import React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  change?: number
  changePeriod?: string
  subtitle?: string
  icon?: React.ReactNode
  variant?: 'default' | 'alert' | 'warning' | 'accent'
  className?: string
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  change,
  changePeriod = 'vs 24h ago',
  subtitle,
  icon,
  variant = 'default',
  className,
}) => {
  const isPositive = (change ?? 0) >= 0

  const getBorderAccent = () => {
    switch (variant) {
      case 'alert':
        return 'hover:border-rose-500/40 dark:hover:border-rose-500/50'
      case 'warning':
        return 'hover:border-amber-500/40 dark:hover:border-amber-500/50'
      case 'accent':
        return 'hover:border-blue-500/40 dark:hover:border-blue-500/50'
      default:
        return 'hover:border-slate-300 dark:hover:border-slate-700'
    }
  }

  return (
    <div
      className={cn(
        'relative bg-card text-card-foreground rounded-lg border border-border p-4 transition-all duration-200 shadow-sm',
        getBorderAccent(),
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight font-mono">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
          </div>
        </div>
        {icon && (
          <div className="p-2 rounded-md bg-secondary/80 text-foreground/80 shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
        {change !== undefined ? (
          <div className="flex items-center gap-1">
            <span
              className={cn(
                'inline-flex items-center text-[11px] font-semibold font-mono px-1.5 py-0.5 rounded',
                isPositive
                  ? 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-400'
                  : 'text-rose-700 bg-rose-500/10 dark:text-rose-400'
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3 mr-0.5 inline" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-0.5 inline" />
              )}
              {isPositive ? `+${change}%` : `${change}%`}
            </span>
            <span className="text-muted-foreground text-[11px]">{changePeriod}</span>
          </div>
        ) : (
          subtitle && <span className="text-muted-foreground text-[11px]">{subtitle}</span>
        )}
      </div>
    </div>
  )
}
