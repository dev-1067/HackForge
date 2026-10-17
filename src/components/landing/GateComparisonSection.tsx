import React from 'react'
import { motion } from 'motion/react'
import { ShieldX, ShieldAlert, ShieldCheck, AlertOctagon, CheckCircle2, UserX, UserCheck } from 'lucide-react'
import { AnimatedSection } from './AnimatedSection'

export const GateComparisonSection: React.FC = () => {
  return (
    <AnimatedSection id="problem" className="py-20 md:py-28 border-t border-border/60 bg-secondary/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-mono text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            THE IDENTITY PARADOX IN GIG PLATFORMS
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-sans">
            The Two Fatal Flaws of Today’s Identity Gates
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
            A delivery platform verifies a rider once during onboarding and then trusts that identity forever.
            Traditional systems fall into one of two crippling extremes:
          </p>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Strict Gate Failure Mode */}
          <div className="p-6 md:p-8 rounded-2xl border border-rose-500/30 bg-card/80 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                  <ShieldX className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  THE STRICT GATE TRAP
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">Re-verify on every login</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Assumes any device or location novelty equals fraud
                </p>
              </div>

              <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-sans">
                Treats every routine life change—buying a new phone, visiting family in another city, or hopping cell towers—as
                an immediate attack. Honest workers get slammed with sudden biometric face scans and account freezes in the middle of dinner rush.
              </p>

              <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5 text-xs font-mono">
                <div className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Consequence: Massive False Positive Friction
                </div>
                <div className="text-muted-foreground text-[11px]">
                  • High honest worker churn (&gt;24% abandonment during lockouts)
                  <br />
                  • Operations overwhelmed by false positive support tickets
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between text-xs font-mono text-rose-600 dark:text-rose-400">
              <span>Failure: Punishes honest workers</span>
              <UserX className="w-4 h-4" />
            </div>
          </div>

          {/* Open Gate Failure Mode */}
          <div className="p-6 md:p-8 rounded-2xl border border-amber-500/30 bg-card/80 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  THE OPEN GATE BLINDSPOT
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">Trust the first check forever</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Assumes verified credentials always mean the verified human
                </p>
              </div>

              <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-sans">
                A verified account is leased, rented, or handed off to an unapproved secondary driver.
                Because the registered smartphone and login token match, the account operates under a legitimate profile for weeks
                without any oversight.
              </p>

              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 text-xs font-mono">
                <div className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Consequence: Unchecked Account Leasing
                </div>
                <div className="text-muted-foreground text-[11px]">
                  • Unvetted operators delivering under stolen/rented identities
                  <br />
                  • Immense compliance liability and platform safety risks
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between text-xs font-mono text-amber-700 dark:text-amber-400">
              <span>Failure: Unchecked rented account abuse</span>
              <UserX className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* The Trust Juggler Resolution Banner */}
        <div className="p-6 md:p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-md space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block">
                  THE TRUST JUGGLER RESOLUTION
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  Continuous Identity: Score Behavior, Not Environmental Life Events
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-emerald-700 dark:text-emerald-300">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>Zero friction for honest life changes · Instant flags on handoffs</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed font-sans max-w-4xl">
            Instead of locking the front door on login changes, Trust Juggler evaluates the rider’s kinetic habits during live dispatches.
            If a genuine rider buys a new phone, we allow the session and learn the new device. If someone hands off the phone to a friend,
            the sudden shift in reaction speed and touch cadence triggers graduated verification.
          </p>
        </div>
      </div>
    </AnimatedSection>
  )
}
