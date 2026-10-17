import React, { useState } from 'react'
import {
  ClipboardList,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ban,
  Camera,
  RotateCcw,
  Clock,
  MapPin,
  Smartphone,
  Eye,
  UserCheck,
  Send,
  FileText,
  Filter,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { EvidenceGauge } from '@/components/ui/EvidenceGauge'
import { DecisionLevel } from '@/types'

interface ReviewItem {
  id: string
  decisionId: number
  sessionId: string
  riderId: string
  riderName: string
  archetype: string
  level: DecisionLevel
  decidedAt: string
  status: 'pending_stepup' | 'unreviewed_escalation' | 'pending_analyst'
  contextScore: number
  habitScore: number
  evidenceScore: number
  threshold: number
  device: string
  city: string
  zone: string
  primaryFlag: string
  reasons: string[]
  explanation: string
  telemetryComparison: {
    metric: string
    baseline: string
    current: string
    zScore: string
    alarm: boolean
  }[]
  biometricMatchEstimate: number // e.g. 12% if takeover, 98% if owner
}

const INITIAL_QUEUE: ReviewItem[] = [
  {
    id: 'rev_1',
    decisionId: 2601,
    sessionId: 'R00007-00039',
    riderId: 'R00007',
    riderName: 'Marcus Chen',
    archetype: 'Full-Time Day Courier',
    level: 'L3',
    decidedAt: '4 mins ago',
    status: 'unreviewed_escalation',
    contextScore: 0.08,
    habitScore: 0.82,
    evidenceScore: 4.12,
    threshold: 3.12,
    device: 'iPhone 13 Pro (iOS 17.4)',
    city: 'London',
    zone: 'Soho Central (Z1)',
    primaryFlag: 'Physical Handoff Signature',
    reasons: [
      'swipe_speed -2.84σ (motor signature slowed)',
      'accept_latency_ms +3.60σ (prolonged response)',
      'hardware device & IP subnet match registered profile',
      '4 consecutive sessions above threshold',
    ],
    explanation:
      'Device, carrier, and zone are identical to Marcus’s known baseline, but kinetic swipe speed and order acceptance latency have diverged sharply (+3.60σ). Signature of physical phone handover to an unauthorized secondary rider.',
    telemetryComparison: [
      { metric: 'Acceptance Latency', baseline: '1,840 ms', current: '6,420 ms', zScore: '+3.60σ', alarm: true },
      { metric: 'Swipe Gesture Speed', baseline: '0.62 m/s', current: '0.28 m/s', zScore: '-2.84σ', alarm: true },
      { metric: 'Tap Cadence Interval', baseline: '212 ms', current: '394 ms', zScore: '+2.45σ', alarm: true },
      { metric: 'Suggested Route Deviation', baseline: '14.2%', current: '38.6%', zScore: '+1.90σ', alarm: false },
    ],
    biometricMatchEstimate: 14,
  },
  {
    id: 'rev_2',
    decisionId: 2602,
    sessionId: 'R00412-00028',
    riderId: 'R00412',
    riderName: 'Devon Vance',
    archetype: 'Night Shift Courier',
    level: 'L3',
    decidedAt: '12 mins ago',
    status: 'pending_analyst',
    contextScore: 0.15,
    habitScore: 0.74,
    evidenceScore: 6.84,
    threshold: 3.12,
    device: 'Google Pixel 7a (Android 14)',
    city: 'Birmingham',
    zone: 'Digbeth Hub (Z2)',
    primaryFlag: 'Timeshare Rental Vector',
    reasons: [
      'recurrent bimodal habit divergence (> 2.8σ delta between shifts)',
      'order cancellation spike 24.5% vs baseline 3.2%',
      'transit velocity variance outside 98th percentile',
      'evidence accumulator 6.84 (2.19x threshold)',
    ],
    explanation:
      'Bimodal behavioral distribution on the same device. Account demonstrates consistent daytime motor habits alternating with erratic late-night delivery patterns. Probable account rental.',
    telemetryComparison: [
      { metric: 'Acceptance Latency', baseline: '1,420 ms', current: '5,840 ms', zScore: '+3.10σ', alarm: true },
      { metric: 'Order Cancellation Rate', baseline: '3.2%', current: '24.5%', zScore: '+4.20σ', alarm: true },
      { metric: 'Swipe Gesture Speed', baseline: '0.71 m/s', current: '0.34 m/s', zScore: '-2.55σ', alarm: true },
      { metric: 'Transit Speed Variance', baseline: '31.2 km/h', current: '18.4 km/h', zScore: '-2.10σ', alarm: true },
    ],
    biometricMatchEstimate: 22,
  },
  {
    id: 'rev_3',
    decisionId: 2603,
    sessionId: 'R01432-00019',
    riderId: 'R01432',
    riderName: 'Tariq Al-Mansoor',
    archetype: 'Automobile Fleet Courier',
    level: 'L4',
    decidedAt: '25 mins ago',
    status: 'unreviewed_escalation',
    contextScore: 0.94,
    habitScore: 0.92,
    evidenceScore: 8.95,
    threshold: 3.12,
    device: 'Emulated Android SDK 31',
    city: 'Manchester',
    zone: 'Trafford (Z5)',
    primaryFlag: 'Automated Bot & Datacenter Proxy',
    reasons: [
      'impossible tap interval (82 ms) indicative of clicker script',
      'datacenter hosting IP ASN (AS9009 M247 Europe)',
      'failed 2 consecutive biometric selfie challenges',
      'evidence accumulator 8.95 (exceeds L4 suspension boundary 7.8)',
    ],
    explanation:
      'Automated script running on headless cloud emulator. User failed two consecutive biometric selfie checks. Immediate account freeze recommended.',
    telemetryComparison: [
      { metric: 'Tap Cadence Interval', baseline: '260 ms', current: '82 ms', zScore: '-4.95σ', alarm: true },
      { metric: 'Acceptance Latency', baseline: '2,200 ms', current: '110 ms', zScore: '-4.80σ', alarm: true },
      { metric: 'Order Velocity / Hr', baseline: '2.5 / hr', current: '7.8 / hr', zScore: '+5.10σ', alarm: true },
      { metric: 'Route Deviation', baseline: '9.2%', current: '78.5%', zScore: '+5.40σ', alarm: true },
    ],
    biometricMatchEstimate: 0,
  },
  {
    id: 'rev_4',
    decisionId: 2604,
    sessionId: 'R00921-00014',
    riderId: 'R00921',
    riderName: 'Kavita Reddy',
    archetype: 'Scooter Courier',
    level: 'L2',
    decidedAt: '38 mins ago',
    status: 'pending_stepup',
    contextScore: 0.22,
    habitScore: 0.61,
    evidenceScore: 3.45,
    threshold: 3.12,
    device: 'Vivo V27 5G (Android 13)',
    city: 'Hyderabad',
    zone: 'Hitec City (Z3)',
    primaryFlag: 'Elevated Habit Deviation',
    reasons: [
      'acceptance latency +2.85σ across 3 consecutive batches',
      'slight route variance during evening rush',
      'hardware device matches registered fingerprint',
    ],
    explanation:
      'Accumulator crossed step-up gate (3.45 vs 3.12). Passive observation recommends non-blocking selfie verification prior to next batch payout.',
    telemetryComparison: [
      { metric: 'Acceptance Latency', baseline: '1,950 ms', current: '4,100 ms', zScore: '+2.85σ', alarm: true },
      { metric: 'Tap Interval', baseline: '280 ms', current: '350 ms', zScore: '+1.40σ', alarm: false },
      { metric: 'Route Deviation', baseline: '12.0%', current: '26.4%', zScore: '+1.80σ', alarm: false },
    ],
    biometricMatchEstimate: 78,
  },
]

export const ReviewQueuePage: React.FC = () => {
  const [queue, setQueue] = useState<ReviewItem[]>(INITIAL_QUEUE)
  const [selectedItemId, setSelectedItemId] = useState<string>(INITIAL_QUEUE[0].id)
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [analystNote, setAnalystNote] = useState<string>('')
  const [verdictFeedback, setVerdictFeedback] = useState<string | null>(null)

  const activeItem = queue.find((item) => item.id === selectedItemId) || queue[0]

  const filteredQueue = queue.filter((item) => {
    if (filterLevel === 'all') return true
    if (filterLevel === 'L3') return item.level === 'L3'
    if (filterLevel === 'L2') return item.level === 'L2'
    if (filterLevel === 'L4') return item.level === 'L4'
    return true
  })

  const handleResolve = (action: 'confirm_takeover' | 'dismiss' | 'stepup') => {
    if (!activeItem) return

    let msg = ''
    if (action === 'confirm_takeover') {
      msg = `Confirmed takeover on ${activeItem.riderId} (${activeItem.riderName}). Account suspended (L4). Feedback loop logged.`
    } else if (action === 'dismiss') {
      msg = `Dismissed suspicion on ${activeItem.riderId}. Account restored to L0 and baseline learning resumed.`
    } else {
      msg = `Dispatched in-app biometric selfie challenge to ${activeItem.riderId}.`
    }

    setVerdictFeedback(msg)
    setAnalystNote('')

    // Remove from queue
    const remaining = queue.filter((i) => i.id !== activeItem.id)
    setQueue(remaining)
    if (remaining.length > 0) {
      setSelectedItemId(remaining[0].id)
    }

    setTimeout(() => {
      setVerdictFeedback(null)
    }, 4500)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Breadcrumb Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            <span>Operations Console</span>
            <span>/</span>
            <span className="text-[#0F3B2C] dark:text-emerald-400">Human-in-the-Loop Review</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Tier-2 Fraud Escalation & Review Queue
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational review workbench for sessions exceeding calibrated step-up and payout-hold thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/70 bg-card text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-muted-foreground">Unreviewed cases:</span>
            <strong className="font-mono text-foreground">{queue.length}</strong>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {verdictFeedback && (
        <div className="p-4 rounded-xl bg-[#0F3B2C] text-white text-xs shadow-md flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="font-medium">{verdictFeedback}</span>
          </div>
          <span className="text-[10px] text-white/70 font-mono">POST /decisions/{activeItem?.decisionId}/review</span>
        </div>
      )}

      {/* Main Grid: Queue List (4 Cols) | Investigation & Decision Deck (8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Queue Items List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {['all', 'L3', 'L2', 'L4'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                    filterLevel === lvl
                      ? 'bg-[#0F3B2C] text-white'
                      : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {lvl === 'all' ? 'All Pending' : lvl}
                </button>
              ))}
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">{filteredQueue.length} items</span>
          </div>

          {filteredQueue.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-border/80 bg-card space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <div className="text-sm font-semibold text-foreground">Review Queue Cleared</div>
              <p className="text-xs text-muted-foreground">
                All escalated sessions have been adjudicated. No pending L2/L3 reviews.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredQueue.map((item) => {
                const isSelected = activeItem && activeItem.id === item.id
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={cn(
                      'p-4 rounded-xl border transition-all cursor-pointer text-left space-y-2',
                      isSelected
                        ? 'border-[#0F3B2C] bg-[#0F3B2C]/5 dark:bg-emerald-500/10 shadow-xs ring-1 ring-[#0F3B2C]'
                        : 'border-border/70 bg-card hover:border-border hover:bg-secondary/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">{item.riderId}</span>
                        <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                          {item.riderName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-mono">{item.decidedAt}</span>
                        <RiskBadge decision={item.level} size="sm" />
                      </div>
                    </div>

                    <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{item.primaryFlag}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-1 border-t border-border/50">
                      <span>Evidence: <strong className="text-amber-600">{item.evidenceScore.toFixed(2)}</strong> / {item.threshold}</span>
                      <span>{item.city}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Item Deep Investigation Deck */}
        {activeItem && (
          <div className="lg:col-span-7 space-y-5">
            {/* Dossier Header */}
            <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-foreground">{activeItem.riderName}</h2>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-secondary font-semibold text-foreground">
                      {activeItem.riderId}
                    </span>
                    <RiskBadge decision={activeItem.level} size="md" showAction />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Flagged: {activeItem.decidedAt}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {activeItem.city} — {activeItem.zone}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[10px] text-muted-foreground uppercase">Decision ID</div>
                  <div className="text-sm font-bold text-foreground">#{activeItem.decisionId}</div>
                </div>
              </div>

              {/* Decoupled Evidence Breakdown */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/60">
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Context Novelty</div>
                  <div className="text-base font-bold font-mono text-foreground mt-0.5">
                    {(activeItem.contextScore * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Hardware / IP</div>
                </div>

                <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Habit Deviation</div>
                  <div className="text-base font-bold font-mono text-amber-600 mt-0.5">
                    {(activeItem.habitScore * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Kinetic Motor Gap</div>
                </div>

                <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Evidence Score</div>
                  <div className="text-base font-bold font-mono text-foreground mt-0.5">
                    {activeItem.evidenceScore.toFixed(2)}{' '}
                    <span className="text-[10px] text-muted-foreground font-normal">/ {activeItem.threshold}</span>
                  </div>
                  <div className="text-[10px] text-amber-600 font-medium mt-0.5">Exceeds Gate</div>
                </div>
              </div>
            </div>

            {/* Plain-English Assessment & Top Factors */}
            <div className="p-4 rounded-xl border border-border/80 bg-secondary/30 space-y-2.5">
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Detection Rationale & Contributing Factors</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">{activeItem.explanation}</p>
              <div className="space-y-1 pt-1">
                {activeItem.reasons.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Kinetic Telemetry Comparison Table */}
            <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Session Telemetry vs Registered Baseline
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-left">
                      <th className="py-2 font-semibold">Metric</th>
                      <th className="py-2 font-semibold font-mono">Rider Baseline</th>
                      <th className="py-2 font-semibold font-mono">Flagged Session</th>
                      <th className="py-2 font-semibold font-mono text-right">Z-Score Deviation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-sans">
                    {activeItem.telemetryComparison.map((m, i) => (
                      <tr key={i}>
                        <td className="py-2 font-medium text-foreground">{m.metric}</td>
                        <td className="py-2 font-mono text-muted-foreground">{m.baseline}</td>
                        <td className="py-2 font-mono font-semibold text-foreground">{m.current}</td>
                        <td className="py-2 font-mono font-bold text-right">
                          <span className={cn(m.alarm ? 'text-rose-600' : 'text-foreground')}>
                            {m.zScore}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Adjudication Workbench: Reviewer Notes & Action Buttons */}
            <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Analyst Verdict & Action</h3>
                <span className="text-[11px] text-muted-foreground font-mono">Reviewer: Asha / Trust Ops</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Investigation Findings & Note (persisted to immutable audit log)
                </label>
                <textarea
                  rows={2}
                  value={analystNote}
                  onChange={(e) => setAnalystNote(e.target.value)}
                  placeholder="e.g., Telemetry confirms physical phone handoff. Secondary operator active on delivery batch."
                  className="w-full px-3 py-2 rounded-xl border border-border/70 bg-secondary/30 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3B2C]"
                />
              </div>

              {/* Decision Action Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  onClick={() => handleResolve('confirm_takeover')}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Confirm Takeover (L4)</span>
                </button>

                <button
                  onClick={() => handleResolve('stepup')}
                  className="px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Step-Up Selfie (L2)</span>
                </button>

                <button
                  onClick={() => handleResolve('dismiss')}
                  className="px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Dismiss & Allow (L0)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
