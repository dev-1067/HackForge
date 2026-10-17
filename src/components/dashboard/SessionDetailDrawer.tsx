import React, { useState, useEffect } from 'react'
import { SessionRecord } from '@/types'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { EvidenceGauge } from '@/components/ui/EvidenceGauge'
import {
  X,
  Smartphone,
  MapPin,
  Wifi,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Fingerprint,
  CheckCircle,
} from 'lucide-react'

interface SessionDetailDrawerProps {
  session: SessionRecord | null
  onClose: () => void
}

export const SessionDetailDrawer: React.FC<SessionDetailDrawerProps> = ({ session, onClose }) => {
  const [challengeSent, setChallengeSent] = useState(false)

  // Reset challenge state when session changes
  useEffect(() => {
    setChallengeSent(false)
  }, [session?.id])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!session) return null

  const handleTriggerStepUp = () => {
    setChallengeSent(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-card text-card-foreground h-full shadow-2xl border-l border-border flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <RiskBadge decision={session.decision} size="md" showAction />
              <span className="text-xs font-mono text-muted-foreground">
                {session.sessionId}
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              {session.riderName}
              <span className="text-xs font-mono font-normal text-muted-foreground">
                ({session.riderId})
              </span>
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close session details"
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Challenge Dispatched Notification Banner */}
          {challengeSent && (
            <div className="p-3.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                <strong>CHALLENGE DISPATCHED:</strong> Graduated L2 biometric selfie prompt sent to{' '}
                {session.riderId}. Dispatch paused until facial telemetry matches account file.
              </span>
            </div>
          )}

          {/* Plain English Reason Box */}
          <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono">
              <Sparkles className="w-4 h-4" />
              SYSTEM EXPLANATION & SIGNAL DECOUPLING
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed font-sans">
              {session.explanation}
            </p>
            <div className="pt-2 border-t border-blue-500/20 text-xs font-mono text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              <span>Recommended Action: {session.recommendedAction}</span>
            </div>
          </div>

          {/* Tri-Gauge: Context vs Habit vs Evidence */}
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              Signal Decoupling Score Breakdown
            </h3>
            <EvidenceGauge
              contextNovelty={session.contextNoveltyScore}
              habitDeviation={session.habitDeviationScore}
              evidenceScore={session.evidenceScore}
            />
          </div>

          {/* Environmental Context Signals */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-500" />
              Context Signals (Hardware & Network)
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded border border-border bg-secondary/30">
                <span className="text-muted-foreground block text-[10px] uppercase">Device Model</span>
                <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                  {session.context.deviceModel}
                </span>
                {session.context.isNewDevice && (
                  <span className="inline-block mt-1 text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded font-semibold">
                    NEW HARDWARE
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded border border-border bg-secondary/30">
                <span className="text-muted-foreground block text-[10px] uppercase">Location & Zone</span>
                <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  {session.context.city} · {session.context.zone}
                </span>
              </div>

              <div className="p-2.5 rounded border border-border bg-secondary/30">
                <span className="text-muted-foreground block text-[10px] uppercase">Network / Carrier</span>
                <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <Wifi className="w-3.5 h-3.5 text-muted-foreground" />
                  {session.context.carrier}
                </span>
              </div>

              <div className="p-2.5 rounded border border-border bg-secondary/30">
                <span className="text-muted-foreground block text-[10px] uppercase">IP Range / Gateway</span>
                <span className="font-semibold text-foreground mt-0.5 block truncate">
                  {session.context.ipRange}
                </span>
                {session.context.isVpnOrProxy && (
                  <span className="inline-block mt-1 text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded font-semibold">
                    PROXY / VPN
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Motor & Kinetic Habit Signals */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-amber-500" />
              Kinetic & Behavioral Habit Signals
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded border border-border bg-secondary/30">
                <span className="text-muted-foreground block text-[10px] uppercase">Accept Latency</span>
                <span className="font-semibold text-foreground text-sm mt-0.5 block">
                  {session.habits.acceptanceLatencySec}s
                </span>
                <span className="text-[10px] text-muted-foreground">baseline: ~3.2s</span>
              </div>

              <div className="p-2.5 rounded border border-border bg-secondary/30">
                <span className="text-muted-foreground block text-[10px] uppercase">Swipe Cadence</span>
                <span className="font-semibold text-foreground text-sm mt-0.5 block">
                  {session.habits.tapSwipeCadenceMs}ms
                </span>
                <span className="text-[10px] text-muted-foreground">baseline: ~350ms</span>
              </div>

              <div className="p-2.5 rounded border border-border bg-secondary/30">
                <span className="text-muted-foreground block text-[10px] uppercase">Velocity Z-Score</span>
                <span className="font-semibold text-foreground text-sm mt-0.5 block">
                  {session.habits.speedProfileZScore} σ
                </span>
                <span className="text-[10px] text-muted-foreground">normal: &lt;1.5 σ</span>
              </div>

              <div className="p-2.5 rounded border border-border bg-secondary/30">
                <span className="text-muted-foreground block text-[10px] uppercase">Route Deviation</span>
                <span className="font-semibold text-foreground text-sm mt-0.5 block">
                  {(session.habits.routeDeviationScore * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-muted-foreground">path efficiency</span>
              </div>

              <div className="p-2.5 rounded border border-border bg-secondary/30">
                <span className="text-muted-foreground block text-[10px] uppercase">Cancel Rate</span>
                <span className="font-semibold text-foreground text-sm mt-0.5 block">
                  {session.habits.cancellationRate}%
                </span>
                <span className="text-[10px] text-muted-foreground">normal: &lt;5%</span>
              </div>

              <div className="p-2.5 rounded border border-border bg-secondary/30">
                <span className="text-muted-foreground block text-[10px] uppercase">Order Pace</span>
                <span className="font-semibold text-foreground text-sm mt-0.5 block">
                  {session.habits.orderPacePerHour}/hr
                </span>
                <span className="text-[10px] text-muted-foreground">completion rate</span>
              </div>
            </div>
          </div>

          {/* Evidence Factors Pill List */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Accumulated Evidence Factors ({session.evidenceFactors.length})
            </h4>
            <div className="space-y-1.5 font-mono text-xs">
              {session.evidenceFactors.map((factor, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded bg-secondary/50 border border-border text-foreground/90"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-between gap-3">
          <div className="text-xs font-mono text-muted-foreground">
            {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleTriggerStepUp}
              disabled={challengeSent}
              className="px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium font-mono hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {challengeSent ? 'Challenge Active ✓' : 'Trigger Step-Up (L2)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
