import React from 'react'
import { motion } from 'motion/react'
import {
  Radio,
  Split,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Zap,
  CheckCircle,
} from 'lucide-react'
import { AnimatedSection } from './AnimatedSection'

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Observe Session Telemetry',
      subtitle: 'Target: < 50ms per scored event',
      description:
        'Capture device hardware, carrier gateway, and GPS zone alongside touch cadence, swipe speed, and dispatch acceptance timing as the rider accepts orders.',
      icon: Radio,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      step: '02',
      title: 'Decouple Context vs. Habit',
      subtitle: 'Dual-pipeline evaluation',
      description:
        'Evaluate Context Novelty against fleet priors; evaluate Habit Deviation against the rider’s personal 30-day multivariate distribution.',
      icon: Split,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
    },
    {
      step: '03',
      title: 'Accumulate Multi-Session Evidence',
      subtitle: 'Exponential moving average (EWMA)',
      description:
        'A single isolated anomaly (wearing winter gloves, heavy rain) never triggers friction. An EWMA accumulator tracks divergence across consecutive deliveries.',
      icon: TrendingUp,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
    },
    {
      step: '04',
      title: 'Proportionate Graduated Ladder',
      subtitle: 'Zero unnecessary blocks',
      description:
        'Apply calibrated thresholds: L0 Allow, L1 Passive Watch, L2 Silent Biometric Step-up, L3 Analyst Review, or L4 Temporary Dispatch Hold.',
      icon: ShieldCheck,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
    },
  ]

  return (
    <AnimatedSection id="how-it-works" className="py-20 md:py-28 border-t border-border/60 bg-secondary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-mono text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            FOUR-STAGE CONTINUOUS PIPELINE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-sans">
            How Trust Juggler Works
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
            From the instant a delivery is assigned to final resolution, the continuous pipeline operates under 50ms
            without disrupting order flow or worker earnings.
          </p>
        </div>

        {/* 4 Connected Stages: Horizontal on large screens, vertical on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {steps.map((item, index) => {
            const Icon = item.icon
            return (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-4 group hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-200"
              >
                {/* Step Number & Icon */}
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black font-mono text-muted-foreground/40 group-hover:text-primary transition-colors">
                    {item.step}
                  </span>
                  <div
                    className={`w-10 h-10 rounded-xl ${item.bgColor} ${item.borderColor} border flex items-center justify-center ${item.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] font-mono text-muted-foreground">{item.subtitle}</p>
                </div>

                <p className="text-xs text-foreground/80 leading-relaxed font-sans">{item.description}</p>

                {/* Bottom line indicator */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Stage {index + 1} of 4</span>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60 hidden md:inline" />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* SLA Guarantee Pill */}
        <div className="max-w-2xl mx-auto p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 text-center space-y-1 font-mono text-xs">
          <div className="font-semibold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-blue-500" />
            ENGINE SPEED: SUB-50MS ASYNC SCORING
          </div>
          <p className="text-muted-foreground text-[11px] font-sans">
            Designed for platforms dispatching tens of thousands of simultaneous gig deliveries without adding latency
            to order acceptance or pickup confirmation.
          </p>
        </div>
      </div>
    </AnimatedSection>
  )
}
