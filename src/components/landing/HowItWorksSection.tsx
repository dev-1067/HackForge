import React from 'react'
import { AnimatedSection } from './AnimatedSection'

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Observe the session',
      subtitle: 'Lightweight background signals',
      description:
        'Gathers lightweight signals during regular dispatches—such as the device model, working hours, and routine order interactions.',
    },
    {
      number: '02',
      title: 'Compare with usual pattern',
      subtitle: 'Context vs. habitual behavior',
      description:
        'Checks whether current habits resemble the rider’s typical delivery rhythm, while recognizing that phones and locations naturally change.',
    },
    {
      number: '03',
      title: 'Look across multiple sessions',
      subtitle: 'Gradual evidence accumulation',
      description:
        'A single rushed order or rainy evening never triggers a false alarm. Evidence builds gradually across several orders before raising questions.',
    },
    {
      number: '04',
      title: 'Recommend an appropriate next step',
      subtitle: 'Proportionate response',
      description:
        'Recommends allowing the shift, learning the new phone, or asking for a quick selfie check only when a persistent pattern is detected.',
    },
  ]

  return (
    <AnimatedSection id="how-it-works" className="py-20 md:py-28 border-t border-border/70 bg-secondary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 font-sans">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary text-xs font-medium text-foreground/80 border border-border">
            <span>How it works</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Four connected steps. Clear, continuous protection.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed font-normal">
            Instead of interrupting deliveries with sudden roadblocks, Trust Juggler operates calmly in the background
            to support genuine riders and flag true irregularities.
          </p>
        </div>

        {/* 4 Connected Process Cards (Paydo Bold Numeric Aesthetic, Completely Icon-Free) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item) => {
            return (
              <div
                key={item.number}
                className="p-7 rounded-3xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-6 hover:shadow-sm hover:border-[#0F3B2C]/30 transition-all duration-200"
              >
                {/* Large Clean Number Badge (Paydo Style) */}
                <div className="text-3xl sm:text-4xl font-extrabold text-[#0F3B2C] dark:text-emerald-400 tracking-tight">
                  {item.number}
                </div>

                {/* Step Content */}
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-foreground tracking-tight">
                    {item.title}
                  </h3>
                  <div className="text-xs text-muted-foreground font-medium">
                    {item.subtitle}
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed font-normal pt-1">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground font-medium">
                  Continuous background pipeline
                </div>
              </div>
            )
          })}
        </div>

        {/* Practical Assurance Note (Clean Paydo Card) */}
        <div className="max-w-2xl mx-auto p-5 rounded-2xl border border-border bg-card text-center space-y-1 text-xs shadow-xs">
          <div className="font-semibold text-foreground text-sm">
            Designed for busy delivery shifts
          </div>
          <p className="text-muted-foreground leading-relaxed font-normal">
            Checks run asynchronously without adding waiting time to order dispatches or delivery confirmations.
          </p>
        </div>
      </div>
    </AnimatedSection>
  )
}
