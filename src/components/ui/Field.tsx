import React, { useId, useState } from 'react'
import { cn } from '@/lib/utils'

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
}

export const Field: React.FC<FieldProps> = ({ label, value, onChange, error, hint, type = 'text', className, ...rest }) => {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-lg border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70',
            'focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring',
            error ? 'border-rose-500' : 'border-border',
            isPassword && 'pr-16',
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 px-3.5 text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none focus-visible:underline"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-rose-700 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
