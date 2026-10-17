import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  Sparkles,
  ArrowRight,
  Info,
  Clock,
  MapPin,
  Wifi,
  Activity,
  Fingerprint,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedSection } from './AnimatedSection'

interface DemoScenario {
  id: string
  label: string
  subtitle: string
  icon: React.ReactNode
  contextNovelty: number
  habitDeviation: number
  evidenceScore: number
  decision: 'L0' | 'L1' | 'L2' | 'L3' | 'L4'
  decisionLabel: string
  decisionColor: string
  contextTelemetry: {
    device: string
    isNewDevice: boolean
    city: string
    zone: string
    carrier: string
    ip: string
    isVpn: boolean
  }
  habitTelemetry: {
    acceptanceLatency: string
    latencyDelta: string
    touchCadence: string
    cadenceDelta: string
    velocityZScore: string
    routeDeviation: string
  }
  explanation: string
  recommendedAction: string
}

export const InteractiveDemoSection: React.FC = () => {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario_b') // Default to handoff

  const scenarios: DemoScenario[] = [
    {
      id: 'scenario_a',
      label: 'Scenario A: New Phone Upgrade',
      subtitle: 'Legitimate hardware life event',
      icon: <Smartphone className="w-4 h-4 text-blue-500" />,
      contextNovelty: 0.88,
      habitDeviation: 0.14,
      evidenceScore: 0.12,
      decision: 'L0',
      decisionLabel: 'L0 ALLOW & LEARN',
      decisionColor: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30',
      contextTelemetry: {
        device: 'Samsung Galaxy S24 Ultra',
        isNewDevice: true,
        city: 'London',
        zone: 'Camden Town',
        carrier: 'Vodafone 5G',
        ip: '148.252.x.x',
        isVpn: false,
      },
      habitTelemetry: {
        acceptanceLatency: '3.4s',
        latencyDelta: 'nominal (baseline: 3.2s)',
        touchCadence: '330ms',
        cadenceDelta: 'normal human variance',
        velocityZScore: '0.4 σ',
        routeDeviation: '14%',
      },
      explanation:
        'New hardware model and cellular IP gateway observed, yet acceptance reaction time, swipe rhythm, and transit profile precisely mirror the rider’s historical 30-day baseline. Inferred benign hardware update.',
      recommendedAction:
        'Allow session (L0) with zero worker friction. Safely bind new handset fingerprint to rider baseline.',
    },
    {
      id: 'scenario_b',
      label: 'Scenario B: Account Handoff',
      subtitle: 'Same phone, different human operating',
      icon: <ShieldAlert className="w-4 h-4 text-amber-500" />,
      contextNovelty: 0.12,
      habitDeviation: 0.82,
      evidenceScore: 0.74,
      decision: 'L2',
      decisionLabel: 'L2 STEP-UP VERIFY',
      decisionColor: 'text-amber-500 bg-amber-500/15 border-amber-500/30',
      contextTelemetry: {
        device: 'iPhone 13 Pro (Registered)',
        isNewDevice: false,
        city: 'London',
        zone: 'Soho / Central',
        carrier: 'EE Mobile (Known SIM)',
        ip: '82.165.x.x',
        isVpn: false,
      },
      habitTelemetry: {
        acceptanceLatency: '14.8s',
        latencyDelta: '+360% vs personal baseline',
        touchCadence: '142ms',
        cadenceDelta: '> 3.2 std deviations drift',
        velocityZScore: '2.8 σ',
        routeDeviation: '74%',
      },
      explanation:
        'Device hardware and network carrier match the registered rider profile, but order acceptance latency and touch interaction cadence have shifted dramatically across consecutive deliveries. Classic signature of a rented handset or secondary rider.',
      recommendedAction:
        'Trigger silent in-app L2 biometric selfie challenge on next delivery acceptance. Prevent account leasing without instant lockout.',
    },
    {
      id: 'scenario_c',
      label: 'Scenario C: Proxy Hop / Bot Attack',
      subtitle: 'Acute takeover & proxy abuse',
      icon: <AlertOctagon className="w-4 h-4 text-rose-500" />,
      contextNovelty: 0.94,
      habitDeviation: 0.91,
      evidenceScore: 0.89,
      decision: 'L4',
      decisionLabel: 'L4 DISPATCH HOLD',
      decisionColor: 'text-rose-500 bg-rose-500/15 border-rose-500/30',
      contextTelemetry: {
        device: 'Motorola Moto G Power (Unmapped)',
        isNewDevice: true,
        city: 'Leeds (Jump from London)',
        zone: 'City Centre Outer',
        carrier: 'Datacenter Proxy',
        ip: '194.38.x.x',
        isVpn: true,
      },
      habitTelemetry: {
        acceptanceLatency: '28.5s',
        latencyDelta: 'extreme hesitation / retry',
        touchCadence: '85ms',
        cadenceDelta: 'machine script signature',
        velocityZScore: '4.2 σ',
        routeDeviation: '89%',
      },
      explanation:
        'Acute simultaneous divergence across both environmental context (datacenter VPN, impossible velocity jump between login cities) and motor cadence (robotic touch rhythm). High certainty of automated credential takeover.',
      recommendedAction:
        'Immediate L4 dispatch suspension. Route directly to operations fraud team for manual review before reactivation.',
    },
  ]

  const active = scenarios.find((s) => s.id === activeScenarioId) || scenarios[1]

  return (
    <AnimatedSection id="demo" className="py-20 md:py-28 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary text-xs font-mono text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            INTERACTIVE SIMULATION LAB
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-sans">
            Compare Scenarios in the Live Engine
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
            Switch between simulated dispatch scenarios below to see how Trust Juggler evaluates
            environmental changes versus behavioral deviations.
          </p>
        </div>

        {/* Disclaimer Notice */}
        <div className="max-w-3xl mx-auto p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs font-mono flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>SIMULATED DEMONSTRATION:</strong> Deterministic mock data for hackathon evaluation.
              Illustrates the decoupled scoring algorithm without connecting to live rider accounts.
            </span>
          </div>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {scenarios.map((sc) => {
            const isSelected = activeScenarioId === sc.id
            return (
              <button
                key={sc.id}
                onClick={() => setActiveScenarioId(sc.id)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-xs font-mono font-medium transition-all duration-200 flex items-center gap-2 border shadow-sm',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-blue-500/20 shadow-md font-semibold -translate-y-0.5'
                    : 'bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
                )}
              >
                {sc.icon}
                <div className="text-left">
                  <div className="font-semibold">{sc.label}</div>
                  <div className={cn('text-[10px] opacity-80', isSelected ? 'text-blue-100' : 'text-muted-foreground')}>
                    {sc.subtitle}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Interactive Playground Card */}
        <div className="max-w-5xl mx-auto p-6 md:p-8 rounded-2xl border border-border bg-card shadow-lg space-y-6">
          {/* Top Bar with Decision Outcome */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Simulated Session Analysis
              </span>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                {active.label}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className={cn('px-3 py-1 rounded-lg text-xs font-mono font-bold border', active.decisionColor)}>
                {active.decisionLabel}
              </span>
            </div>
          </div>

          {/* Dials & Gauges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-blue-500" /> Context Novelty
                </span>
                <span className="font-bold text-foreground">{Math.round(active.contextNovelty * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${active.contextNovelty * 100}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
              <span className="text-[10px] text-muted-foreground block">
                {active.contextNovelty > 0.5 ? 'Significant environment novelty' : 'Familiar environment verified'}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-amber-500" /> Habit Deviation
                </span>
                <span className={cn('font-bold', active.habitDeviation > 0.5 ? 'text-amber-500' : 'text-foreground')}>
                  {Math.round(active.habitDeviation * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${active.habitDeviation * 100}%` }}
                  transition={{ duration: 0.3 }}
                  className={cn('h-full rounded-full', active.habitDeviation > 0.5 ? 'bg-amber-500' : 'bg-emerald-500')}
                />
              </div>
              <span className="text-[10px] text-muted-foreground block">
                {active.habitDeviation > 0.5 ? 'Motor habits altered from baseline' : 'Motor habits match historical baseline'}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Fingerprint className="w-3.5 h-3.5 text-rose-500" /> Multi-Session Evidence
                </span>
                <span className={cn('font-bold', active.evidenceScore > 0.6 ? 'text-rose-500' : 'text-foreground')}>
                  {Math.round(active.evidenceScore * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${active.evidenceScore * 100}%` }}
                  transition={{ duration: 0.3 }}
                  className={cn('h-full rounded-full', active.evidenceScore > 0.6 ? 'bg-rose-500' : 'bg-blue-500')}
                />
              </div>
              <span className="text-[10px] text-muted-foreground block">
                {active.evidenceScore > 0.6 ? 'EWMA persistent breach' : 'Within calibrated safe boundary'}
              </span>
            </div>
          </div>

          {/* Telemetry Breakdown Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Context Telemetry */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> Environmental Context Signals
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between p-1.5 rounded bg-secondary/40">
                  <span className="text-muted-foreground">Handset Model:</span>
                  <span className="font-semibold text-foreground">{active.contextTelemetry.device}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-secondary/40">
                  <span className="text-muted-foreground">Location & Zone:</span>
                  <span className="font-semibold text-foreground">
                    {active.contextTelemetry.city} · {active.contextTelemetry.zone}
                  </span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-secondary/40">
                  <span className="text-muted-foreground">Carrier & IP:</span>
                  <span className="font-semibold text-foreground">
                    {active.contextTelemetry.carrier} ({active.contextTelemetry.ip})
                  </span>
                </div>
              </div>
            </div>

            {/* Habit Telemetry */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-500" /> Kinetic Habit Metrics
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between p-1.5 rounded bg-secondary/40">
                  <span className="text-muted-foreground">Acceptance Delay:</span>
                  <span className="font-semibold text-foreground">
                    {active.habitTelemetry.acceptanceLatency} ({active.habitTelemetry.latencyDelta})
                  </span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-secondary/40">
                  <span className="text-muted-foreground">Touch Cadence:</span>
                  <span className="font-semibold text-foreground">
                    {active.habitTelemetry.touchCadence} ({active.habitTelemetry.cadenceDelta})
                  </span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-secondary/40">
                  <span className="text-muted-foreground">Transit Variance:</span>
                  <span className="font-semibold text-foreground">
                    Z: {active.habitTelemetry.velocityZScore} · Deviation: {active.habitTelemetry.routeDeviation}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Calibrated Plain-English Reason Box */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono">
                <Sparkles className="w-4 h-4" />
                SYSTEM EXPLANATION & CALIBRATED ACTION
              </div>
              <p className="text-xs sm:text-sm text-foreground/90 font-sans leading-relaxed">
                {active.explanation}
              </p>
              <div className="pt-2 border-t border-blue-500/20 text-xs font-mono text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                <span>Enforced Response: {active.recommendedAction}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AnimatedSection>
  )
}
