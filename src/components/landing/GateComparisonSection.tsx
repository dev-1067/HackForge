import React from 'react'
import { AnimatedSection } from './AnimatedSection'

export const GateComparisonSection: React.FC = () => {
  return (
    <AnimatedSection id="problem" className="py-20 md:py-28 border-t border-border/70 bg-secondary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 font-sans">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary text-xs font-medium text-foreground/80 border border-border">
            <span>The real-world dilemma</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Two extreme approaches. Both fail.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed font-normal">
            When someone logs in to deliver food, most systems either suspect everything or verify nothing.
            Both approaches fail riders and delivery platforms alike.
          </p>
        </div>

        {/* Side-by-Side Comparison Grid (Clean Paydo Card Aesthetic, Completely Icon-Free) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Too Many Checks */}
          <div className="p-7 md:p-9 rounded-3xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                  Too many checks
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">Re-verifying on every minor change</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Assumes any new phone or location is an attack
                </p>
              </div>

              <p className="text-sm text-foreground/80 leading-relaxed font-normal">
                A rider buys a replacement phone or takes orders in a neighboring zone.
                The system treats the new device as an intrusion, freezing the account and demanding sudden
                selfie scans in the middle of a busy shift.
              </p>

              <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-1 text-xs">
                <div className="text-foreground font-semibold">
                  Impact on genuine couriers
                </div>
                <p className="text-muted-foreground leading-relaxed font-normal">
                  Honest delivery workers lose precious order time, experience unnecessary stress,
                  and are repeatedly forced to re-prove who they are.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-medium">
              <span>Failure: False alarms punish honest riders</span>
            </div>
          </div>

          {/* Too Much Trust */}
          <div className="p-7 md:p-9 rounded-3xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                  Too much trust
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">Trusting the initial check forever</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Assumes registered credentials always guarantee the verified human
                </p>
              </div>

              <p className="text-sm text-foreground/80 leading-relaxed font-normal">
                An account is verified once during sign-up, and then trusted indefinitely.
                When an account is handed off, leased, or operated by an unapproved secondary driver,
                the platform never notices because the device token and login credentials match.
              </p>

              <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-1 text-xs">
                <div className="text-foreground font-semibold">
                  Impact on platform safety
                </div>
                <p className="text-muted-foreground leading-relaxed font-normal">
                  Unverified drivers operate under someone else's profile, leaving platforms exposed to safety risks
                  and regulatory compliance issues.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-medium">
              <span>Failure: Silent account sharing goes undetected</span>
            </div>
          </div>
        </div>

        {/* Signature Paydo Deep Forest Green Container */}
        <div className="p-8 md:p-11 rounded-3xl bg-[#0F3B2C] text-white shadow-xl space-y-4 border border-[#16533E]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-[#D4F469] font-bold block">
                A more thoughtful middle ground
              </span>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Look at how the account is driven—not just where it logged in
              </h3>
            </div>

            <div className="text-xs text-[#D4F469] font-medium px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 whitespace-nowrap self-start md:self-auto">
              Smooth for genuine riders • Clear alerts on true handoffs
            </div>
          </div>

          <p className="text-sm md:text-base text-white/85 leading-relaxed max-w-4xl font-normal pt-1">
            Instead of locking the door whenever a rider changes their phone, Trust Juggler observes delivery behavior.
            If a genuine rider buys a new smartphone, their familiar rhythm shines through and the session is allowed.
            If someone else takes over the phone, persistent changes across deliveries trigger a respectful check.
          </p>
        </div>
      </div>
    </AnimatedSection>
  )
}
