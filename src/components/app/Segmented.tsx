import React from 'react'
import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}

/** A small radio group drawn as joined buttons. */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-lg border border-border">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-3.5 py-2 text-app-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            value === option.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
