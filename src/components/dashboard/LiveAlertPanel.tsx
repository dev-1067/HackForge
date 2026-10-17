import React from 'react'
import { LiveAlert } from '@/types'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { formatRelativeTime } from '@/lib/utils'
import { AlertCircle, Clock, ArrowRight, CheckCircle2 } from 'lucide-react'

interface LiveAlertPanelProps {
  alerts: LiveAlert[]
  onSelectAlertSession: (sessionId: string) => void
  onDismissAlert?: (id: string) => void
}

export const LiveAlertPanel: React.FC<LiveAlertPanelProps> = ({
  alerts,
  onSelectAlertSession,
  onDismissAlert,
}) => {
  return (
    <div className="bg-card border border-border/80 rounded-2xl flex flex-col h-full shadow-xs font-sans overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/70 flex items-center justify-between bg-secondary/35">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-foreground">
            Review Queue Escalations
          </h3>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold">
            {alerts.length} need review
          </span>
        </div>
      </div>

      {/* Alert Feed Items */}
      <div className="divide-y divide-border/60 overflow-y-auto max-h-[380px]">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2 opacity-80" />
            No active escalations. Ongoing rider sessions match verified habit baselines.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 hover:bg-secondary/30 transition-colors space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <RiskBadge decision={alert.decision} size="sm" />
                    <span className="font-semibold text-xs text-foreground font-mono">
                      {alert.riderId}
                    </span>
                    <span className="text-xs text-muted-foreground">({alert.riderName})</span>
                  </div>
                  <h4 className="text-xs font-semibold text-foreground/90 pt-0.5">
                    {alert.title}
                  </h4>
                </div>

                <div className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3 opacity-60" />
                  <span>{formatRelativeTime(alert.timestamp)}</span>
                </div>
              </div>

              {/* Dynamic Plain-English Explanation */}
              <p className="text-xs text-foreground/85 leading-relaxed bg-secondary/40 p-3 rounded-xl border border-border/60">
                {alert.summary}
              </p>

              {/* Key Factor Bullets */}
              <div className="space-y-1">
                {alert.reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="text-[11px] text-muted-foreground flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80 shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center justify-between text-xs">
                <button
                  onClick={() => onSelectAlertSession(alert.sessionId)}
                  className="inline-flex items-center gap-1 text-[#0F3B2C] dark:text-emerald-400 hover:underline font-medium text-xs transition-colors"
                >
                  <span>Review Evidence Signals</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                {onDismissAlert && (
                  <button
                    onClick={() => onDismissAlert(alert.id)}
                    className="text-muted-foreground hover:text-foreground text-[11px] transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
