import React from 'react'
import { cn } from '@/lib/utils'

const TONES = {
  error: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
  info: 'border-border bg-secondary/60 text-foreground',
  warning: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
}

export const Alert: React.FC<{ tone?: keyof typeof TONES; children: React.ReactNode; className?: string }> = ({
  tone = 'info', children, className,
}) => (
  <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-lg border px-3.5 py-2.5 text-sm', TONES[tone], className)}>
    {children}
  </div>
)
