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
    <div className="bg-card border border-border rounded-lg flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <h3 className="font-bold text-sm text-foreground">
            Active Decision Alerts
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-semibold">
            {alerts.length} require action
          </span>
        </div>
      </div>

      {/* Alert Feed Items */}
      <div className="divide-y divide-border overflow-y-auto max-h-[380px]">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs font-mono">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-70" />
            No active escalations. All ongoing sessions currently within calibrated tolerances.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 hover:bg-secondary/40 transition-colors space-y-2.5"
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

                <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3 opacity-70" />
                  <span>{formatRelativeTime(alert.timestamp)}</span>
                </div>
              </div>

              {/* Dynamic Plain-English Explanation */}
              <p className="text-xs text-foreground/80 leading-relaxed font-sans bg-secondary/40 p-2.5 rounded border border-border/60">
                {alert.summary}
              </p>

              {/* Key Factor Bullets */}
              <div className="space-y-1">
                {alert.reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500/70 shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center justify-between text-xs">
                <button
                  onClick={() => onSelectAlertSession(alert.sessionId)}
                  className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium font-mono text-[11px] transition-colors"
                >
                  <span>Review Evidence Signals</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                {onDismissAlert && (
                  <button
                    onClick={() => onDismissAlert(alert.id)}
                    className="text-muted-foreground hover:text-foreground text-[11px] font-mono transition-colors"
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
