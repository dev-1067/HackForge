import React from 'react'

/** Marks activity that comes from the simulation rather than from real use. */
export const DemoTag: React.FC = () => (
  <span
    className="ml-2 rounded border border-dashed border-border px-1.5 py-px text-app-xs font-medium text-muted-foreground"
    title="This comes from the demo simulation, not from real deliveries."
  >
    Demo data
  </span>
)
