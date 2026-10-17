import React from 'react'
import { SessionRecord } from '@/types'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { EvidenceGauge } from '@/components/ui/EvidenceGauge'
import { formatTimestamp, formatRelativeTime } from '@/lib/utils'
import { Smartphone, MapPin, ChevronRight, Inbox, Clock } from 'lucide-react'

interface LiveSessionTableProps {
  sessions: SessionRecord[]
  onSelectSession: (session: SessionRecord) => void
  selectedSessionId?: string
}

export const LiveSessionTable: React.FC<LiveSessionTableProps> = ({
  sessions,
  onSelectSession,
  selectedSessionId,
}) => {
  if (sessions.length === 0) {
    return (
      <div className="py-12 px-4 text-center border border-dashed border-border rounded-lg bg-card/50">
        <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-semibold text-foreground">No sessions match current filter</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Try clearing your search term or switching to "All Decisions" to see the live feed stream.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-border rounded-lg bg-card">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-secondary/50 font-mono uppercase text-[11px] text-muted-foreground tracking-wider select-none">
            <th className="py-3 px-3">Session & Time</th>
            <th className="py-3 px-3">Rider</th>
            <th className="py-3 px-3">Context Signals</th>
            <th className="py-3 px-3">Decoupled Score</th>
            <th className="py-3 px-3">Decision</th>
            <th className="py-3 px-3 text-right">Inspect</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border font-sans">
          {sessions.map((session) => {
            const isSelected = selectedSessionId === session.id

            return (
              <tr
                key={session.id}
                onClick={() => onSelectSession(session)}
                className={`group cursor-pointer transition-colors duration-150 hover:bg-secondary/60 ${
                  isSelected ? 'bg-primary/5 dark:bg-blue-600/10' : ''
                }`}
              >
                {/* Session ID & Timestamp */}
                <td className="py-3 px-3 whitespace-nowrap font-mono">
                  <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {session.sessionId}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 opacity-70" />
                    <span>{formatTimestamp(session.timestamp)}</span>
                    <span className="opacity-60 font-sans">({formatRelativeTime(session.timestamp)})</span>
                  </div>
                </td>

                {/* Rider ID & Name */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <div className="font-medium text-foreground">{session.riderName}</div>
                  <div className="text-[11px] font-mono text-muted-foreground">{session.riderId}</div>
                </td>

                {/* Context Status */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-foreground/90 font-mono">
                    <Smartphone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[150px]">{session.context.deviceModel}</span>
                    {session.context.isNewDevice && (
                      <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[150px]">
                      {session.context.city} · {session.context.zone}
                    </span>
                  </div>
                </td>

                {/* Decoupled Habit vs Context Gauges */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <EvidenceGauge
                    contextNovelty={session.contextNoveltyScore}
                    habitDeviation={session.habitDeviationScore}
                    evidenceScore={session.evidenceScore}
                    compact
                  />
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    Evidence accumulator: <span className="font-semibold text-foreground">{Math.round(session.evidenceScore * 100)}%</span>
                  </div>
                </td>

                {/* Decision Badge */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <RiskBadge decision={session.decision} showAction />
                </td>

                {/* Inspect Action */}
                <td className="py-3 px-3 whitespace-nowrap text-right">
                  <span className="inline-flex items-center justify-center p-1 rounded hover:bg-secondary text-muted-foreground group-hover:text-foreground transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
