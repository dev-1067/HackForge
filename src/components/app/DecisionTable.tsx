import React from 'react'
import { Link } from 'react-router-dom'
import type { Decision } from '@/types/api'
import { LEVEL_LABEL, LEVEL_TONE, explain, whenText } from '@/lib/plain'
import { StatusPill } from '@/components/ui/StatusPill'
import { EmptyState } from '@/components/ui/EmptyState'

const place = (d: Decision) => [d.context?.city, d.context?.zone].filter(Boolean).join(' · ') || '—'

/** Recent sessions with a plain-language result. Each row opens the rider. */
export const DecisionTable: React.FC<{ decisions: Decision[]; emptyText?: string }> = ({ decisions, emptyText }) => {
  if (decisions.length === 0) {
    return <EmptyState title="Nothing to show yet">{emptyText ?? 'Sessions appear here as riders use the app.'}</EmptyState>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[13px] text-muted-foreground">
            <th className="px-4 py-2 font-medium">When</th>
            <th className="px-4 py-2 font-medium">Rider</th>
            <th className="px-4 py-2 font-medium">Where</th>
            <th className="px-4 py-2 font-medium">Result</th>
            <th className="px-4 py-2 font-medium">What we saw</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {decisions.map((d) => (
            <tr key={d.decision_id} className="hover:bg-secondary/40">
              <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{whenText(d.started_at ?? d.decided_at)}</td>
              <td className="whitespace-nowrap px-4 py-2">
                <Link to={`/riders/${encodeURIComponent(d.rider_id)}`} className="font-medium text-foreground hover:underline focus:outline-none focus-visible:underline">
                  {d.rider_name ?? `Rider ${d.rider_id}`}
                </Link>
                {d.rider_name && <span className="ml-2 text-[13px] text-muted-foreground">{d.rider_id}</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{place(d)}</td>
              <td className="px-4 py-2"><StatusPill tone={LEVEL_TONE[d.level]}>{LEVEL_LABEL[d.level]}</StatusPill></td>
              <td className="max-w-xs truncate px-4 py-2 text-muted-foreground" title={explain(d).summary}>{explain(d).summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
