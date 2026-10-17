import React from 'react'

export const Spinner: React.FC<{ label?: string }> = ({ label = 'Loading' }) => (
  <div role="status" className="inline-flex items-center gap-2 text-app-sm text-muted-foreground">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
    <span>{label}…</span>
  </div>
)
