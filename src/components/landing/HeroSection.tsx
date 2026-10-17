import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Smartphone,
  Gauge,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const HeroSection: React.FC = () => {
  // Hero interactive state: toggle between 'new_phone' (benign) and 'handoff' (fraud)
  const [activeHeroMode, setActiveHeroMode] = useState<'new_phone' | 'handoff'>('new_phone')

  const isNewPhone = activeHeroMode === 'new_phone'

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-500/10 dark:bg-blue-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-violet-500/10 dark:bg-violet-600/10 blur-[110px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Hackathon Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-mono backdrop-blur-sm animate-in fade-in duration-300">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-semibold">HACKFORGE PROBLEM STATEMENT 1:</span>
            <span className="opacity-80">The Rented Account Problem</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground font-sans leading-[1.08]">
            Detect the <span className="bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 bg-clip-text text-transparent">handoff</span>.
            <br className="hidden sm:inline" /> Not the <span className="underline decoration-blue-500/40 decoration-wavy decoration-2">life change</span>.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto font-sans">
            A real-time continuous behavioral identity engine for gig delivery platforms. We decouple
            benign environmental life events (new phone, new city, new SIM) from immutable motor habits
            (swipe cadence, acceptance latency, route choices) to stop rented accounts without locking out honest workers.
          </p>

          {/* CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 font-mono text-xs">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <Activity className="w-4 h-4" />
              <span>Explore Live Command Center</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <a
              href="#demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card/80 text-foreground font-medium text-sm hover:bg-secondary transition-all hover:border-slate-400 dark:hover:border-slate-600"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Test Interactive Scenarios</span>
            </a>
          </div>
        </div>

        {/* Hero Product Graphic: Animated Decoupled Engine Visualizer */}
        <div className="mt-14 max-w-5xl mx-auto">
          <div className="p-1 rounded-2xl bg-gradient-to-b from-border via-border/60 to-transparent shadow-2xl">
            <div className="rounded-[15px] bg-card border border-border/80 overflow-hidden backdrop-blur-md">
              {/* Graphic Top Bar & Switcher */}
              <div className="p-4 bg-secondary/50 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-mono">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/40 border border-rose-500/60" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500/60" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500/60" />
                  </div>
                  <span className="font-semibold text-foreground ml-2">DECISION ENGINE PIPELINE</span>
                  <span className="text-[10px] text-muted-foreground uppercase hidden md:inline">
                    · Real-Time Scoring (&lt; 50ms)
                  </span>
                </div>

                {/* Hero Scenario Mode Selector */}
                <div className="flex items-center gap-1.5 p-1 bg-background/80 rounded-lg border border-border">
                  <button
                    onClick={() => setActiveHeroMode('new_phone')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5',
                      isNewPhone
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-sm font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Scenario A: New Phone (Life Event)</span>
                  </button>

                  <button
                    onClick={() => setActiveHeroMode('handoff')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5',
                      !isNewPhone
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-sm font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Scenario B: Account Handoff</span>
                  </button>
                </div>
              </div>

              {/* Graphic Flow Layout: 3 Columns (Inputs -> Engine -> Graduated Decision) */}
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                {/* Column 1: Dual Input Streams */}
                <div className="space-y-4">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    <span>1. Telemetry Ingestion</span>
                  </div>

                  {/* Context Block */}
                  <motion.div
                    animate={{
                      borderColor: isNewPhone ? 'rgba(59, 130, 246, 0.4)' : 'rgba(226, 232, 240, 0.2)',
                      backgroundColor: isNewPhone ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    }}
                    transition={{ duration: 0.3 }}
                    className="p-3.5 rounded-xl border border-border space-y-2 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                        Context Signals
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                          isNewPhone
                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                            : 'bg-secondary text-muted-foreground'
                        )}
                      >
                        {isNewPhone ? 'CHANGED (+88%)' : 'UNCHANGED (8%)'}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Hardware:</span>
                        <span className="font-medium text-foreground">
                          {isNewPhone ? 'Samsung S24 Ultra (New)' : 'iPhone 13 Pro (Known)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>IP / Carrier:</span>
                        <span className="font-medium text-foreground">
                          {isNewPhone ? 'Vodafone 5G (New IP)' : 'EE Mobile (Usual)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Zone:</span>
                        <span className="font-medium text-foreground">London · Camden</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Habit Block */}
                  <motion.div
                    animate={{
                      borderColor: !isNewPhone ? 'rgba(245, 158, 11, 0.5)' : 'rgba(226, 232, 240, 0.2)',
                      backgroundColor: !isNewPhone ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                    }}
                    transition={{ duration: 0.3 }}
                    className="p-3.5 rounded-xl border border-border space-y-2 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-amber-500" />
                        Habit Signals
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                          !isNewPhone
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        )}
                      >
                        {!isNewPhone ? 'DIVERGED (+78%)' : 'STABLE (14%)'}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Accept Latency:</span>
                        <span className={cn('font-medium', !isNewPhone ? 'text-amber-500 font-bold' : 'text-foreground')}>
                          {!isNewPhone ? '14.8s (norm: 3.2s)' : '3.4s (baseline: 3.2s)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Swipe Cadence:</span>
                        <span className={cn('font-medium', !isNewPhone ? 'text-amber-500 font-bold' : 'text-foreground')}>
                          {!isNewPhone ? '142ms (>3σ drift)' : '330ms (normal)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Route Deviation:</span>
                        <span className="font-medium text-foreground">{!isNewPhone ? '68%' : '11%'}</span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Column 2: Decoupled Scoring Core */}
                <div className="flex flex-col justify-between p-4 rounded-xl border border-border bg-secondary/20 space-y-4">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>2. Decoupled Evidence Engine</span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">Context Novelty</span>
                        <span className="font-bold text-foreground">{isNewPhone ? '0.88 (High)' : '0.12 (Low)'}</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          animate={{ width: isNewPhone ? '88%' : '12%' }}
                          transition={{ duration: 0.4 }}
                          className="h-full bg-blue-500 rounded-full"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">Habit Deviation</span>
                        <span className={cn('font-bold', !isNewPhone ? 'text-amber-500' : 'text-foreground')}>
                          {!isNewPhone ? '0.78 (Severe)' : '0.14 (Nominal)'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          animate={{ width: !isNewPhone ? '78%' : '14%' }}
                          transition={{ duration: 0.4 }}
                          className={cn('h-full rounded-full', !isNewPhone ? 'bg-amber-500' : 'bg-emerald-500')}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">Multi-Session EWMA Evidence</span>
                        <span className={cn('font-bold', !isNewPhone ? 'text-rose-500' : 'text-foreground')}>
                          {!isNewPhone ? '0.74 (Threshold Breach)' : '0.12 (Safe)'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          animate={{ width: !isNewPhone ? '74%' : '12%' }}
                          transition={{ duration: 0.4 }}
                          className={cn('h-full rounded-full', !isNewPhone ? 'bg-rose-500' : 'bg-blue-500')}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card border border-border/80 text-[10px] font-mono text-muted-foreground">
                    ⚡ <strong>Calibrated Rule Applied:</strong>{' '}
                    {isNewPhone
                      ? 'Context changed legitimately without habit drift -> Categorize as Life Event'
                      : 'Context matching, but motor behavior diverged -> Categorize as Secondary User Handoff'}
                  </div>
                </div>

                {/* Column 3: Calibrated Decision Outcome */}
                <div className="flex flex-col justify-between p-4 rounded-xl border border-border bg-card space-y-4">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>3. Proportionate Action</span>
                  </div>

                  <AnimatePresence mode="wait">
                    {isNewPhone ? (
                      <motion.div
                        key="allow"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2"
                      >
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold font-mono text-sm">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          <span>L0 ALLOW SESSION</span>
                        </div>
                        <p className="text-xs text-foreground/90 font-sans leading-relaxed">
                          Honest worker protected. New device detected, but motor habits match the rider.
                          Zero friction. Device fingerprint safely added to baseline.
                        </p>
                        <div className="pt-2 border-t border-emerald-500/20 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                          Worker Churn Prevented: 100%
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="stepup"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2"
                      >
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold font-mono text-sm">
                          <ShieldAlert className="w-4 h-4 text-amber-500" />
                          <span>L2 STEP-UP VERIFICATION</span>
                        </div>
                        <p className="text-xs text-foreground/90 font-sans leading-relaxed">
                          Possible rented handoff detected. Acceptance latency +360% on familiar phone.
                          Silent biometric selfie challenge triggered prior to order dispatch.
                        </p>
                        <div className="pt-2 border-t border-amber-500/20 text-[11px] font-mono text-amber-700 dark:text-amber-300">
                          Escalation Reason: Suspected Secondary Operator
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="text-[11px] font-mono text-muted-foreground flex items-center justify-between border-t border-border/60 pt-3">
                    <span>Engine Response Time:</span>
                    <span className="font-bold text-foreground">18.4 ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
