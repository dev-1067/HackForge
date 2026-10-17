import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { AnimatedSection } from './AnimatedSection'

interface DemoScenario {
  id: string
  label: string
  statusHeadline: string
  statusTag: string
  statusTagColor: string
  contextNovelty: number
  habitDeviation: number
  evidenceScore: number
  contextTelemetry: {
    device: string
    isNewDevice: boolean
    city: string
    network: string
  }
  habitTelemetry: {
    acceptanceLatency: string
    latencyDescription: string
    touchCadence: string
    cadenceDescription: string
  }
  explanation: string
  nextStep: string
}

export const InteractiveDemoSection: React.FC = () => {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario_new_phone')

  const scenarios: DemoScenario[] = [
    {
      id: 'scenario_new_phone',
      label: 'Scenario 1: A rider gets a new phone',
      statusHeadline: 'A familiar pattern, on a new phone.',
      statusTag: 'Pattern looks familiar',
      statusTagColor: 'text-[#0F3B2C] dark:text-emerald-300 bg-[#0F3B2C]/10 dark:bg-emerald-950/40 border-[#0F3B2C]/20 dark:border-emerald-700/30',
      contextNovelty: 0.85,
      habitDeviation: 0.12,
      evidenceScore: 0.10,
      contextTelemetry: {
        device: 'Samsung Galaxy S24 Ultra (New device)',
        isNewDevice: true,
        city: 'London • Camden Zone',
        network: 'Vodafone 5G mobile network',
      },
      habitTelemetry: {
        acceptanceLatency: '3.4 seconds',
        latencyDescription: 'Matches usual 3.2s response time',
        touchCadence: 'Familiar screen interaction rhythm',
        cadenceDescription: 'Consistent with Marcus Chen’s 30-day baseline',
      },
      explanation:
        'The phone has changed, but the rider’s usual delivery habits remain familiar. Order reaction times, tap cadences, and routing choices match historical patterns.',
      nextStep: 'Allow the shift to continue without interruption. Safely register the new device to the rider’s profile.',
    },
    {
      id: 'scenario_handoff',
      label: 'Scenario 2: A possible account handoff',
      statusHeadline: 'Something about this pattern has changed.',
      statusTag: 'Worth a closer look',
      statusTagColor: 'text-[#0F3B2C] dark:text-emerald-300 bg-[#0F3B2C]/10 dark:bg-emerald-950/40 border-[#0F3B2C]/25 dark:border-emerald-600/40',
      contextNovelty: 0.15,
      habitDeviation: 0.82,
      evidenceScore: 0.78,
      contextTelemetry: {
        device: 'iPhone 13 Pro (Registered device)',
        isNewDevice: false,
        city: 'London • Soho Central',
        network: 'EE Mobile (Known SIM card)',
      },
      habitTelemetry: {
        acceptanceLatency: '14.8 seconds',
        latencyDescription: 'Significantly slower than usual 3.2s pace',
        touchCadence: 'Noticeably different screen touch timing',
        cadenceDescription: 'Persistent difference observed across 4 consecutive orders',
      },
      explanation:
        'The device and location look familiar, but the rider’s activity has shifted over several sessions. Noticeable order hesitation and unfamiliar interaction patterns suggest someone else may be operating the handset.',
      nextStep: 'Prompt a quick, polite in-app selfie check before the next order batch to verify identity without freezing the account.',
    },
  ]

  const active = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0]

  return (
    <AnimatedSection id="demo" className="py-20 md:py-28 border-t border-border/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 font-sans">
        {/* Section Heading & Unobtrusive Example Badge */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary text-xs font-medium text-foreground/80 border border-border">
            <span>Example scenario</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Compare two real-world scenarios
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed font-normal">
            See how Trust Juggler distinguishes between an honest rider with a new device and a possible account handoff.
          </p>
        </div>

        {/* Scenario Switcher Tabs (Consistent pill geometry and active green styling) */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {scenarios.map((sc) => {
            const isSelected = activeScenarioId === sc.id
            return (
              <button
                key={sc.id}
                onClick={() => setActiveScenarioId(sc.id)}
                className={cn(
                  'px-6 py-3 rounded-full text-xs transition-all duration-200 border shadow-xs text-left',
                  isSelected
                    ? 'bg-[#0F3B2C] text-white border-[#0F3B2C] dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-100 font-semibold shadow-sm -translate-y-0.5'
                    : 'bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground font-medium'
                )}
              >
                <div className="font-semibold text-sm">{sc.label}</div>
                <div className="text-[11px] opacity-80 mt-0.5">{sc.statusTag}</div>
              </button>
            )
          })}
        </div>

        {/* Interactive Comparison Card */}
        <div className="max-w-4xl mx-auto p-7 md:p-9 rounded-3xl border border-border/90 bg-card shadow-md space-y-6 transition-colors duration-200">
          {/* Header with Natural Headline & Status Tag */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground block">
                {active.label}
              </span>
              <h3 className="text-xl font-bold text-foreground tracking-tight">
                {active.statusHeadline}
              </h3>
            </div>

            <span className={cn('self-start sm:self-center px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors', active.statusTagColor)}>
              {active.statusTag}
            </span>
          </div>

          {/* Three Key Indicator Gauges (Clean, balanced green theme with clear contrast) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Phone & Area */}
            <div className="p-4 rounded-2xl border border-border/80 bg-secondary/30 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">
                  Phone & Area
                </span>
                <span className="font-semibold text-foreground">{Math.round(active.contextNovelty * 100)}% Changed</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${active.contextNovelty * 100}%` }}
                  transition={{ duration: 0.25 }}
                  className="h-full bg-[#0F3B2C] dark:bg-emerald-400 rounded-full"
                />
              </div>
              <span className="text-[11px] text-muted-foreground block min-h-[16px]">
                {active.contextNovelty > 0.5 ? 'New phone model detected' : 'Familiar registered phone'}
              </span>
            </div>

            {/* Delivery Behavior */}
            <div className="p-4 rounded-2xl border border-border/80 bg-secondary/30 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">
                  Delivery Behavior
                </span>
                <span className={cn('font-semibold', active.habitDeviation > 0.5 ? 'text-[#0F3B2C] dark:text-emerald-300' : 'text-foreground')}>
                  {Math.round(active.habitDeviation * 100)}% Deviation
                </span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${active.habitDeviation * 100}%` }}
                  transition={{ duration: 0.25 }}
                  className="h-full bg-[#0F3B2C] dark:bg-emerald-400 rounded-full"
                />
              </div>
              <span className="text-[11px] text-muted-foreground block min-h-[16px]">
                {active.habitDeviation > 0.5 ? 'Unusual delivery rhythm' : 'Matches rider’s usual rhythm'}
              </span>
            </div>

            {/* Multi-session trend */}
            <div className="p-4 rounded-2xl border border-border/80 bg-secondary/30 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">
                  Multi-Session Trend
                </span>
                <span className={cn('font-semibold', active.evidenceScore > 0.5 ? 'text-[#0F3B2C] dark:text-emerald-300' : 'text-foreground')}>
                  {Math.round(active.evidenceScore * 100)}% Shift
                </span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${active.evidenceScore * 100}%` }}
                  transition={{ duration: 0.25 }}
                  className="h-full bg-[#0F3B2C] dark:bg-emerald-400 rounded-full"
                />
              </div>
              <span className="text-[11px] text-muted-foreground block min-h-[16px]">
                {active.evidenceScore > 0.5 ? 'Repeated across several shifts' : 'Consistent across recent shifts'}
              </span>
            </div>
          </div>

          {/* Clean Signal Detail Panels (Unified matching height and padding) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Phone & Network */}
            <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-2.5">
              <span className="text-xs font-semibold text-muted-foreground block">
                Phone & Network Details
              </span>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-secondary/40 flex justify-between items-center min-h-[42px]">
                  <span className="text-muted-foreground">Device:</span>
                  <span className="font-medium text-foreground">{active.contextTelemetry.device}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-secondary/40 flex justify-between items-center min-h-[42px]">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium text-foreground">{active.contextTelemetry.city}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-secondary/40 flex justify-between items-center min-h-[42px]">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="font-medium text-foreground">{active.contextTelemetry.network}</span>
                </div>
              </div>
            </div>

            {/* Delivery Behavior */}
            <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-2.5">
              <span className="text-xs font-semibold text-muted-foreground block">
                Observed Delivery Behavior
              </span>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-secondary/40 flex justify-between items-center min-h-[42px]">
                  <span className="text-muted-foreground">Acceptance Delay:</span>
                  <span className="font-medium text-foreground">{active.habitTelemetry.acceptanceLatency}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-secondary/40 flex flex-col gap-0.5 justify-center min-h-[42px]">
                  <span className="text-muted-foreground text-[11px]">Order timing:</span>
                  <span className="font-medium text-foreground">{active.habitTelemetry.latencyDescription}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-secondary/40 flex flex-col gap-0.5 justify-center min-h-[42px]">
                  <span className="text-muted-foreground text-[11px]">Interaction:</span>
                  <span className="font-medium text-foreground">{active.habitTelemetry.cadenceDescription}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Explanation & Action Box (Cohesive subtle green-tinted background with clear contrast) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="p-6 rounded-2xl border border-[#0F3B2C]/20 dark:border-emerald-800/40 bg-[#0F3B2C]/5 dark:bg-emerald-950/20 space-y-2.5 transition-colors"
            >
              <div className="text-xs font-bold text-foreground">
                How Trust Juggler evaluates this session
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed font-normal">
                {active.explanation}
              </p>
              <div className="pt-2.5 border-t border-border/70 text-xs text-[#0F3B2C] dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                <span>Next step: {active.nextStep}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AnimatedSection>
  )
}
