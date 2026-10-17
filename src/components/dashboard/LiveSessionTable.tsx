import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
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
    <div className="overflow-x-auto border border-border/80 rounded-2xl bg-card shadow-xs">
      <table className="w-full text-left text-xs border-collapse font-sans">
        <thead>
          <tr className="border-b border-border/80 bg-secondary/35 text-[11px] font-semibold text-muted-foreground select-none">
            <th className="py-3.5 px-4">Session & Time</th>
            <th className="py-3.5 px-4">Rider Account</th>
            <th className="py-3.5 px-4">Context Signals</th>
            <th className="py-3.5 px-4">Habit vs Context</th>
            <th className="py-3.5 px-4">Status</th>
            <th className="py-3.5 px-4 text-right">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          <AnimatePresence initial={false}>
            {sessions.map((session) => {
              const isSelected = selectedSessionId === session.id

              return (
                <motion.tr
                  key={session.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => onSelectSession(session)}
                  className={`group cursor-pointer transition-colors duration-150 hover:bg-secondary/40 ${
                    isSelected ? 'bg-[#0F3B2C]/5 dark:bg-emerald-600/10' : ''
                  }`}
                >
                  {/* Session ID & Timestamp */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors font-mono text-xs">
                      {session.sessionId}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 opacity-60" />
                      <span>{formatTimestamp(session.timestamp)}</span>
                      <span className="opacity-60">({formatRelativeTime(session.timestamp)})</span>
                    </div>
                  </td>

                  {/* Rider ID & Name */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-medium text-foreground text-xs">{session.riderName}</div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{session.riderId}</div>
                  </td>

                  {/* Context Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-foreground/90 text-xs">
                      <Smartphone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[150px] font-medium">{session.context.deviceModel}</span>
                      {session.context.isNewDevice && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                          New Device
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
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <EvidenceGauge
                      contextNovelty={session.contextNoveltyScore}
                      habitDeviation={session.habitDeviationScore}
                      evidenceScore={session.evidenceScore}
                      compact
                    />
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Evidence accumulated: <span className="font-semibold text-foreground">{Math.round(session.evidenceScore * 100)}%</span>
                    </div>
                  </td>

                  {/* Decision Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <RiskBadge decision={session.decision} showAction />
                  </td>

                  {/* Inspect Action */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                      <span className="hidden sm:inline">Inspect</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </td>
                </motion.tr>
              )
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}
