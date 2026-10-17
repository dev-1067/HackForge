import React, { useEffect, useId, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const control = 'rounded-lg border border-border bg-card px-3 py-2 text-app-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40'

/** Text that waits for a short pause before it is used for a request. */
export function useDebounced(value: string, delay = 250): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}

export const SearchInput: React.FC<{ value: string; onChange: (v: string) => void; label: string; placeholder: string; className?: string }> = ({ value, onChange, label, placeholder, className }) => (
  <div className={cn('relative', className)}>
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    <input
      type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} maxLength={80}
      className={cn(control, 'w-full pl-9 placeholder:text-muted-foreground/70')}
    />
  </div>
)

export const SelectFilter: React.FC<{
  label: string; value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>; className?: string
}> = ({ label, value, onChange, options, className }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={cn(control, className)}>
    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
)

export const DateField: React.FC<{ label: string; value: string; onChange: (v: string) => void; min?: string; max?: string }> = ({ label, value, onChange, min, max }) => {
  const id = useId()
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-app-13 text-muted-foreground">
      {label}
      <input id={id} type="date" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} className={cn(control, 'py-1.5')} />
    </label>
  )
}

export interface ActiveFilter { key: string; label: string; clear: () => void }

/** Shows what is filtering the list and lets the user remove one filter or all of them. */
export const ActiveFilters: React.FC<{ filters: ActiveFilter[]; onClearAll: () => void }> = ({ filters, onClearAll }) => {
  if (filters.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {filters.map((f) => (
        <span key={f.key} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 py-0.5 pl-2.5 pr-1 text-app-13 text-foreground">
          {f.label}
          <button type="button" onClick={f.clear} aria-label={`Remove filter: ${f.label}`}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClearAll} className="text-app-13 font-medium text-foreground underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Clear all filters
      </button>
    </div>
  )
}
