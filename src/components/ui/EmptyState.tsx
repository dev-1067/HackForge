import React from 'react'

export const EmptyState: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="px-4 py-10 text-center">
    <p className="text-app-sm font-medium text-foreground">{title}</p>
    {children && <p className="mx-auto mt-1 max-w-sm text-app-13 text-muted-foreground">{children}</p>}
  </div>
)
