import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { AnimatedSection } from './AnimatedSection'

interface MatrixCell {
  id: string
  contextState: string
  habitState: string
  title: string
  meaning: string
  recommendation: string
  badgeVariant: 'success' | 'info' | 'warning' | 'review'
  action: string
  telemetrySummary: string
  detailedExplanation: string
}

export const DecoupledMatrixSection: React.FC = () => {
  const [selectedCellId, setSelectedCellId] = useState<string>('c0_h1')

  const matrixCells: MatrixCell[] = [
    {
      id: 'c0_h0',
      contextState: 'Familiar Phone & Area',
      habitState: 'Familiar Habits',
      title: '1. Standard Delivery Shift',
      meaning: 'Familiar phone, typical delivery behavior',
      recommendation: 'Allow without interruption',
      badgeVariant: 'success',
      action: 'Allow the shift normally with zero friction.',
      telemetrySummary: 'Familiar smartphone • Routine orders • Expected cadence',
      detailedExplanation:
        'Both the phone environment and delivery habits match the rider’s regular pattern. The session proceeds smoothly without any interruption.',
    },
    {
      id: 'c1_h0',
      contextState: 'Changed Phone or City',
      habitState: 'Familiar Habits',
      title: '2. Normal Life Event',
      meaning: 'New smartphone or delivering in a new neighborhood',
      recommendation: 'Allow and learn new context',
      badgeVariant: 'info',
      action: 'Allow the shift without stopping work. Safely learn the new phone.',
      telemetrySummary: 'New device model • Familiar order acceptance • Same rhythm',
      detailedExplanation:
        'The phone or cellular network has changed, but the way orders are accepted and completed matches the rider’s usual rhythm. The system recognizes a legitimate upgrade and adapts gracefully.',
    },
    {
      id: 'c0_h1',
      contextState: 'Familiar Phone & Area',
      habitState: 'Persistent Behavior Change',
      title: '3. Possible Account Handoff',
      meaning: 'Registered phone, but unusual delivery patterns',
      recommendation: 'Consider further checks',
      badgeVariant: 'warning',
      action: 'Suggest a friendly in-app selfie check before the next batch of orders.',
      telemetrySummary: 'Registered phone • Hesitant order acceptance • Different touch timing',
      detailedExplanation:
        'The registered phone is being used, but order reaction times and interaction patterns have changed across several consecutive deliveries. This pattern may indicate that someone else is operating the phone, warranting a closer look.',
    },
    {
      id: 'c1_h1',
      contextState: 'Changed Phone or City',
      habitState: 'Persistent Behavior Change',
      title: '4. Simultaneous Divergence',
      meaning: 'Unrecognized phone with completely unfamiliar behavior',
      recommendation: 'Consider stronger verification or review',
      badgeVariant: 'review',
      action: 'Pause dispatches and route for quick human-in-the-loop review.',
      telemetrySummary: 'Unrecognized device • Remote location • Unfamiliar delivery pattern',
      detailedExplanation:
        'Both the environment (unfamiliar device, unexpected network) and operational habits have diverged significantly. The system recommends stronger identity verification or analyst review before continuing dispatches.',
    },
  ]

  const activeCell = matrixCells.find((c) => c.id === selectedCellId) || matrixCells[2]

  return (
    <AnimatedSection id="approach" className="py-20 md:py-28 border-t border-border/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 font-sans">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary text-xs font-medium text-foreground/80 border border-border">
            <span>Our balanced approach</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            A new phone is a change. A new pattern deserves a closer look.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed font-normal">
            Trust Juggler separates what changes naturally during everyday life from how an account is actually operated.
            Instead of locking riders out for getting a new phone, we look for consistent behavioral patterns over time.
          </p>
        </div>

        {/* Signals Breakdown: Context vs Habit (Clean Paydo Card Styling, Zero Icons) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Context Signals Card */}
          <div className="p-7 md:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-foreground">Context Signals</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Changes naturally during everyday life
              </p>
            </div>

            <p className="text-sm text-foreground/80 leading-relaxed font-normal">
              Environmental factors that frequently change for normal reasons: buying a new phone, operating system updates,
              visiting family, switching mobile carriers, or taking a shift in a different neighborhood.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <span className="p-3 rounded-2xl bg-secondary/50 border border-border text-foreground/85 font-medium">
                Phone model & system
              </span>
              <span className="p-3 rounded-2xl bg-secondary/50 border border-border text-foreground/85 font-medium">
                City & delivery zone
              </span>
              <span className="p-3 rounded-2xl bg-secondary/50 border border-border text-foreground/85 font-medium">
                Mobile carrier & network
              </span>
              <span className="p-3 rounded-2xl bg-secondary/50 border border-border text-foreground/85 font-medium">
                Shift hours & schedule
              </span>
            </div>
          </div>

          {/* Habit Signals Card */}
          <div className="p-7 md:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-foreground">Habit Signals</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Personal to the individual rider
              </p>
            </div>

            <p className="text-sm text-foreground/80 leading-relaxed font-normal">
              Familiar ways of working that develop naturally over weeks of deliveries: how quickly an order is reviewed and accepted,
              screen tap rhythm, typical transit pace, and usual break routines.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <span className="p-3 rounded-2xl bg-secondary/50 border border-border text-foreground/85 font-medium">
                Order acceptance pace
              </span>
              <span className="p-3 rounded-2xl bg-secondary/50 border border-border text-foreground/85 font-medium">
                Screen tap & swipe rhythm
              </span>
              <span className="p-3 rounded-2xl bg-secondary/50 border border-border text-foreground/85 font-medium">
                Delivery speed profile
              </span>
              <span className="p-3 rounded-2xl bg-secondary/50 border border-border text-foreground/85 font-medium">
                Navigation & break rhythm
              </span>
            </div>
          </div>
        </div>

        {/* Interactive 2x2 Matrix Grid */}
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">
              Four possible outcomes
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {matrixCells.map((cell) => {
              const isSelected = selectedCellId === cell.id

              const getVariantColors = () => {
                switch (cell.badgeVariant) {
                  case 'success':
                    return isSelected
                      ? 'border-[#0F3B2C] dark:border-emerald-500 bg-[#0F3B2C]/5 shadow-sm'
                      : 'border-border hover:border-[#0F3B2C]/40'
                  case 'info':
                    return isSelected
                      ? 'border-blue-500 bg-blue-500/5 shadow-sm'
                      : 'border-border hover:border-blue-500/40'
                  case 'warning':
                    return isSelected
                      ? 'border-amber-500 bg-amber-500/5 shadow-sm'
                      : 'border-border hover:border-amber-500/40'
                  case 'review':
                    return isSelected
                      ? 'border-rose-500 bg-rose-500/5 shadow-sm'
                      : 'border-border hover:border-rose-500/40'
                }
              }

              return (
                <div
                  key={cell.id}
                  onClick={() => setSelectedCellId(cell.id)}
                  className={cn(
                    'p-6 rounded-3xl border bg-card cursor-pointer transition-all duration-200 shadow-xs space-y-3 group',
                    getVariantColors()
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground font-medium">
                        <span>{cell.contextState}</span> • <span>{cell.habitState}</span>
                      </div>
                      <h4 className="font-bold text-sm text-foreground group-hover:text-[#0F3B2C] dark:group-hover:text-emerald-400 transition-colors">
                        {cell.title}
                      </h4>
                    </div>

                    <span
                      className={cn(
                        'text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap border',
                        cell.badgeVariant === 'success'
                          ? 'bg-[#0F3B2C]/10 text-[#0F3B2C] dark:text-emerald-300 border-[#0F3B2C]/20'
                          : cell.badgeVariant === 'info'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                          : cell.badgeVariant === 'warning'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                      )}
                    >
                      {cell.recommendation}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed font-normal">{cell.meaning}</p>

                  <div className="text-xs text-foreground/80 flex items-center justify-between pt-2.5 border-t border-border/60">
                    <span className="truncate">{cell.action}</span>
                    <span className="text-xs opacity-60 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Selected Cell Detail Callout */}
          <AnimatePresence mode="wait">
            {activeCell && (
              <motion.div
                key={activeCell.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="p-6 md:p-7 rounded-3xl border border-border bg-card shadow-xs space-y-3 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0F3B2C] dark:bg-emerald-400" />
                    <span className="font-bold text-foreground text-sm">{activeCell.title}</span>
                  </div>
                  <div className="text-muted-foreground text-xs">{activeCell.telemetrySummary}</div>
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed font-normal pt-1">
                  {activeCell.detailedExplanation}
                </p>

                <div className="pt-2 text-xs text-[#0F3B2C] dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span>Recommended response: {activeCell.action}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AnimatedSection>
  )
}
