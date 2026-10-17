import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Smartphone,
  Fingerprint,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Info,
  Sliders,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedSection } from './AnimatedSection'

interface MatrixCell {
  id: string
  contextState: 'unchanged' | 'changed'
  habitState: 'unchanged' | 'changed'
  title: string
  meaning: string
  decision: string
  badgeVariant: 'success' | 'info' | 'warning' | 'critical'
  action: string
  telemetryNote: string
  detailedExplanation: string
}

export const DecoupledMatrixSection: React.FC = () => {
  const [selectedCellId, setSelectedCellId] = useState<string>('c0_h1') // Default to the core handoff problem

  const matrixCells: MatrixCell[] = [
    {
      id: 'c0_h0',
      contextState: 'unchanged',
      habitState: 'unchanged',
      title: 'Nominal Worker Session',
      meaning: 'Standard delivery shift',
      decision: 'L0 ALLOW',
      badgeVariant: 'success',
      action: 'Allow session normally; update longitudinal confidence metric.',
      telemetryNote: 'Context novelty: 0.08 · Habit deviation: 0.12 · Evidence score: 0.06',
      detailedExplanation:
        'Both environmental context (hardware ID, cell tower, delivery zone) and motor habit metrics (acceptance hesitation, swipe cadence, route choices) match the rider’s 30-day baseline distributions.',
    },
    {
      id: 'c1_h0',
      contextState: 'changed',
      habitState: 'unchanged',
      title: 'Legitimate Life Event',
      meaning: 'New phone, moved city, or roaming network',
      decision: 'L0 ALLOW & LEARN',
      badgeVariant: 'info',
      action: 'Allow session with zero friction. Safely bind new device fingerprint to profile.',
      telemetryNote: 'Context novelty: 0.88 · Habit deviation: 0.16 · Evidence score: 0.18',
      detailedExplanation:
        'Hardware model or IP subnet has shifted, but neuromuscular interaction cadence, swipe rhythm, and dispatch acceptance latency are identical to historical rider habits. Protects honest worker from false lockout.',
    },
    {
      id: 'c0_h1',
      contextState: 'unchanged',
      habitState: 'changed',
      title: 'Suspected Account Handoff',
      meaning: 'Same phone, different person operating handset',
      decision: 'L2/L3 STEP-UP ESCALATION',
      badgeVariant: 'warning',
      action: 'Prompt silent biometric selfie gate before dispatching next batch of orders.',
      telemetryNote: 'Context novelty: 0.12 · Habit deviation: 0.84 · Evidence score: 0.78',
      detailedExplanation:
        'The registered device and SIM match, but dispatch acceptance delay has spiked by +360% and swipe timing has diverged by >3 standard deviations. Classic signature of a rented or loaned account.',
    },
    {
      id: 'c1_h1',
      contextState: 'changed',
      habitState: 'changed',
      title: 'Acute Takeover / Credential Theft',
      meaning: 'Total anomaly across environment and motor habits',
      decision: 'L4 TEMPORARY SUSPENSION',
      badgeVariant: 'critical',
      action: 'Pause dispatch privileges; route to operations team for identity reverification.',
      telemetryNote: 'Context novelty: 0.94 · Habit deviation: 0.92 · Evidence score: 0.91',
      detailedExplanation:
        'Both environmental parameters (unmapped device, datacenter proxy) and operational habits (scripted swipe cadence, erratic transit velocity) have simultaneously diverged. High confidence of malicious takeover.',
    },
  ]

  const activeCell = matrixCells.find((c) => c.id === selectedCellId) || matrixCells[2]

  return (
    <AnimatedSection id="decoupled" className="py-20 md:py-28 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary text-xs font-mono text-muted-foreground">
            <Sliders className="w-3.5 h-3.5 text-primary" />
            CORE ARCHITECTURE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-sans">
            The Decoupled Decision Matrix
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
            Most engines treat any change as fraud. Trust Juggler separates signals into what an honest human
            changes legitimately versus what an impostor cannot fake.
          </p>
        </div>

        {/* Signals Breakdown: Context vs Habit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Context Signals Card */}
          <div className="p-6 rounded-2xl border border-indigo-500/30 bg-card/60 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Context Signals</h3>
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    Cheap to change legitimately (Weak standalone evidence)
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed font-sans">
              Environmental telemetry that changes during normal human life: device upgrades, OS updates, visiting family,
              switching cellular carriers, or working a new delivery zone.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <span className="p-2 rounded bg-secondary/50 border border-border">Device Model & ID</span>
              <span className="p-2 rounded bg-secondary/50 border border-border">Operating System</span>
              <span className="p-2 rounded bg-secondary/50 border border-border">City & Delivery Zone</span>
              <span className="p-2 rounded bg-secondary/50 border border-border">Carrier & IP Gateway</span>
            </div>
          </div>

          {/* Habit Signals Card */}
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-card/60 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Habit Signals</h3>
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                    Hard to copy or hand over (Strong fraud evidence)
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed font-sans">
              Subconscious motor reflexes and operational traits unique to a rider: acceptance delay, touch intervals,
              navigation habits, route efficiency, and typical break rhythms.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <span className="p-2 rounded bg-secondary/50 border border-border">Acceptance Latency (ms)</span>
              <span className="p-2 rounded bg-secondary/50 border border-border">Swipe & Tap Cadence</span>
              <span className="p-2 rounded bg-secondary/50 border border-border">Transit Speed Variance (σ)</span>
              <span className="p-2 rounded bg-secondary/50 border border-border">Route Deviation Ratio</span>
            </div>
          </div>
        </div>

        {/* Interactive 2x2 Matrix Grid */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Interactive 2×2 Decision Grid
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Click any cell below to see how Trust Juggler evaluates the combination in real time:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {matrixCells.map((cell) => {
              const isSelected = selectedCellId === cell.id

              const getVariantColors = () => {
                switch (cell.badgeVariant) {
                  case 'success':
                    return isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-emerald-500/10'
                      : 'border-emerald-500/30 hover:border-emerald-500/60'
                  case 'info':
                    return isSelected
                      ? 'border-blue-500 bg-blue-500/10 shadow-blue-500/10'
                      : 'border-blue-500/30 hover:border-blue-500/60'
                  case 'warning':
                    return isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-amber-500/10'
                      : 'border-amber-500/30 hover:border-amber-500/60'
                  case 'critical':
                    return isSelected
                      ? 'border-rose-500 bg-rose-500/10 shadow-rose-500/10'
                      : 'border-rose-500/30 hover:border-rose-500/60'
                }
              }

              return (
                <div
                  key={cell.id}
                  onClick={() => setSelectedCellId(cell.id)}
                  className={cn(
                    'p-5 rounded-xl border bg-card cursor-pointer transition-all duration-200 shadow-sm relative space-y-3 group',
                    getVariantColors()
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="font-semibold text-muted-foreground uppercase">
                          Context: {cell.contextState} · Habit: {cell.habitState}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                        {cell.title}
                      </h4>
                    </div>

                    <span
                      className={cn(
                        'text-[10px] font-mono px-2 py-0.5 rounded font-bold whitespace-nowrap',
                        cell.badgeVariant === 'success'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : cell.badgeVariant === 'info'
                          ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
                          : cell.badgeVariant === 'warning'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-400'
                      )}
                    >
                      {cell.decision}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed font-sans">{cell.meaning}</p>

                  <div className="text-[11px] font-mono text-foreground/80 flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="truncate">{cell.action}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detailed Inspector for Selected Matrix Cell */}
          <AnimatePresence mode="wait">
            {activeCell && (
              <motion.div
                key={activeCell.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-5 md:p-6 rounded-2xl border border-blue-500/30 bg-card shadow-md space-y-3 font-mono text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-foreground text-sm font-sans">{activeCell.title}</span>
                    <span className="text-muted-foreground">({activeCell.decision})</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{activeCell.telemetryNote}</div>
                </div>

                <p className="text-xs text-foreground/90 font-sans leading-relaxed pt-1">
                  {activeCell.detailedExplanation}
                </p>

                <div className="pt-2 text-xs text-primary font-semibold flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Enforced Action: {activeCell.action}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AnimatedSection>
  )
}
