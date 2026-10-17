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
  variant?: 'default' | 'alert' | 'warning' | 'accent' | 'featured'
  className?: string
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  change,
  changePeriod = 'vs 24h',
  subtitle,
  icon,
  variant = 'default',
  className,
}) => {
  const isPositive = (change ?? 0) >= 0
  const isFeatured = variant === 'featured'

  if (isFeatured) {
    return (
      <div
        className={cn(
          'relative bg-[#0F3B2C] text-white rounded-2xl p-5 shadow-sm transition-all duration-200 border border-[#16533E]/50 flex flex-col justify-between min-h-[140px]',
          className
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-emerald-100/80 tracking-normal font-sans">
              {title}
            </p>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl font-bold tracking-tight font-sans">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
            </div>
          </div>
          {icon && (
            <div className="p-2.5 rounded-xl bg-white/10 text-white shrink-0 backdrop-blur-xs">
              {icon}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-white/10">
          {change !== undefined ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#84CC16] text-[#0F3B2C]">
                {isPositive ? `+${change}%` : `${change}%`}
              </span>
              <span className="text-emerald-100/70 text-[11px]">{changePeriod}</span>
            </div>
          ) : (
            subtitle && <span className="text-emerald-100/70 text-[11px]">{subtitle}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative bg-card text-card-foreground rounded-2xl border border-border/80 p-5 transition-all duration-200 shadow-xs hover:border-border flex flex-col justify-between min-h-[140px]',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground tracking-normal font-sans">
            {title}
          </p>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-bold tracking-tight text-foreground font-sans">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
          </div>
        </div>
        {icon && (
          <div className="p-2.5 rounded-xl bg-secondary/80 text-foreground/80 shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-border/60">
        {change !== undefined ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full',
                isPositive
                  ? 'text-emerald-800 bg-emerald-500/15 dark:text-emerald-300 dark:bg-emerald-500/20'
                  : 'text-rose-800 bg-rose-500/15 dark:text-rose-300 dark:bg-rose-500/20'
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3 mr-1 inline" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1 inline" />
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
