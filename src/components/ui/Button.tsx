import React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  size?: 'md' | 'sm'
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'border border-border bg-card text-foreground hover:bg-secondary',
  ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
  danger: 'bg-rose-700 text-white hover:bg-rose-800',
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', loading = false, size = 'md', className, children, disabled, type = 'button', ...rest
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-60',
      size === 'md' ? 'px-4 py-2.5 text-sm' : 'px-3 py-1.5 text-[13px]',
      VARIANTS[variant],
      className,
    )}
    {...rest}
  >
    {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
    {children}
  </button>
)
