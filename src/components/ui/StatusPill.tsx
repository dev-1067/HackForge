import React from 'react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/plain'

const DOT: Record<Tone, string> = {
  ok: 'bg-emerald-500',
  watch: 'bg-slate-400',
  attention: 'bg-amber-500',
  serious: 'bg-rose-600',
}

/** A small dot and a word. The dot colour is the only decoration. */
export const StatusPill: React.FC<{ tone: Tone; children: React.ReactNode; className?: string }> = ({ tone, children, className }) => (
  <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-foreground', className)}>
    <span className={cn('h-2 w-2 rounded-full', DOT[tone])} aria-hidden="true" />
    {children}
  </span>
)
