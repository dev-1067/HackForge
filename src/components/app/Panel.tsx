import React from 'react'
import { cn } from '@/lib/utils'

/** A bordered section with a title row. The only container style used on the operations pages. */
export const Panel: React.FC<{
  title?: string
  note?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  flush?: boolean
}> = ({ title, note, action, children, className, flush }) => (
  <section className={cn('tj-rise rounded-xl border border-border bg-card', className)}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          {title && <h2 className="text-app-15 font-semibold text-foreground">{title}</h2>}
          {note && <p className="text-app-13 text-muted-foreground">{note}</p>}
        </div>
        {action}
      </div>
    )}
    <div className={flush ? '' : 'p-4'}>{children}</div>
  </section>
)
