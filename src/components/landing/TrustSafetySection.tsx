import React from 'react'
import { AnimatedSection } from './AnimatedSection'

export const TrustSafetySection: React.FC = () => {
  const principles = [
    {
      title: 'One unusual shift is never proof',
      description:
        'A rider in winter gloves, rushing through heavy rain, or taking a detoured route may have an atypical session. Trust Juggler never blocks an account on a single isolated anomaly.',
    },
    {
      title: 'Human review for serious decisions',
      description:
        'We do not believe in opaque automated bans. Any situation requiring consequential intervention routes to platform operations teams with clear, context-rich summaries.',
    },
    {
      title: 'Clear, explainable reasoning',
      description:
        'Every risk recommendation is accompanied by plain-English explanations showing exactly why an action was suggested, ensuring accountability and easy auditing.',
    },
    {
      title: 'Minimized, privacy-conscious data',
      description:
        'We only look at the high-level kinetic signals needed to confirm continuity. We never collect or store intrusive personal surveillance or biometric raw footage.',
    },
  ]

  return (
    <AnimatedSection id="safety" className="py-20 md:py-28 border-t border-border/70 bg-secondary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 font-sans">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary text-xs font-medium text-foreground/80 border border-border">
            <span>Responsible design</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Trust and safety built around real workers
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed font-normal">
            Identity verification should protect genuine riders’ livelihoods—not add stress to their daily shifts.
          </p>
        </div>

        {/* 4 Concise Safeguards (Paydo Card Aesthetic, Completely Icon-Free) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {principles.map((p, idx) => {
            return (
              <div
                key={idx}
                className="p-7 md:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-2.5 hover:shadow-sm hover:border-[#0F3B2C]/30 transition-all duration-200"
              >
                <div className="text-xs font-bold text-[#0F3B2C] dark:text-emerald-400">
                  Principle 0{idx + 1}
                </div>
                <h3 className="font-bold text-lg text-foreground tracking-tight">{p.title}</h3>
                <p className="text-sm text-foreground/80 leading-relaxed font-normal pt-1">
                  {p.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* Short Summary Bar (Clean Card) */}
        <div className="max-w-2xl mx-auto p-5 rounded-2xl border border-border bg-card text-center space-y-1 text-xs shadow-xs">
          <div className="font-semibold text-foreground text-sm">
            Worker-First Protection Principles
          </div>
          <p className="text-muted-foreground leading-relaxed font-normal">
            Fairer checks • Transparent decisions • Fewer disruptions to honest earnings
          </p>
        </div>
      </div>
    </AnimatedSection>
  )
}
