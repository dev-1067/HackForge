import React from 'react'
import {
  ShieldAlert,
  Lock,
  UserCheck,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileText,
} from 'lucide-react'
import { AnimatedSection } from './AnimatedSection'

export const TrustSafetySection: React.FC = () => {
  const principles = [
    {
      title: 'Multi-Session Evidence Accumulation',
      tag: 'ANTI-FALSE-POSITIVE',
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      description:
        'A rider wearing winter gloves, hurrying through heavy rain, or navigating a sudden road closure will experience isolated motor anomalies. Trust Juggler never blocks an account on a single session; evidence must accumulate persistently across consecutive shifts before triggering friction.',
    },
    {
      title: 'Profile Poisoning Defense',
      tag: 'INTEGRITY GUARANTEE',
      icon: Lock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      description:
        'A common vulnerability in adaptive biometrics is profile poisoning—where an attacker gradually modifies their habits to poison the historical mean. Trust Juggler updates a rider’s baseline ONLY if the session has passed full identity corroboration, permanently locking the model against adversarial drift.',
    },
    {
      title: 'Human-in-the-Loop Analyst Workbench',
      tag: 'PROPORTIONATE ESCALATION',
      icon: UserCheck,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      description:
        'Consequential actions (Level 3 and Level 4) are not black-box automated bans. Suspicious profiles are routed to a human fraud review queue with side-by-side evidence factors, allowing operations teams to make informed decisions before interrupting rider livelihoods.',
    },
    {
      title: 'Sub-50ms Edge-Optimized Inference',
      tag: 'SCALE & LATENCY',
      icon: Cpu,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/30',
      description:
        'Designed to scale to tens of thousands of riders and millions of deliveries. The decoupled scoring path runs in under 50ms asynchronously, ensuring dispatch matching and customer delivery ETAs are never slowed down by identity checks.',
    },
  ]

  return (
    <AnimatedSection id="safety" className="py-20 md:py-28 border-t border-border/60 bg-secondary/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-mono text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-blue-500" />
            ENGINE INTEGRITY & WORKER FAIRNESS
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-sans">
            Built on Rigorous Trust & Safety Principles
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
            How we protect gig workers’ civil liberties and livelihoods while giving platforms enterprise-grade fraud immunity.
          </p>
        </div>

        {/* 2x2 Distinct Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {principles.map((p, idx) => {
            const Icon = p.icon
            return (
              <div
                key={idx}
                className="p-6 md:p-8 rounded-2xl border border-border bg-card shadow-sm space-y-4 hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-10 h-10 rounded-xl ${p.bgColor} ${p.borderColor} border flex items-center justify-center ${p.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-secondary text-muted-foreground border border-border">
                    {p.tag}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-foreground">{p.title}</h3>
                <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-sans">{p.description}</p>
              </div>
            )
          })}
        </div>

        {/* Worker Protection Callout Box */}
        <div className="p-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-foreground font-sans">Ethical Design & Worker Retention</div>
              <div className="text-[11px] text-muted-foreground">
                Zero automated suspensions on uncorroborated anomaly spikes.
              </div>
            </div>
          </div>

          <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold whitespace-nowrap">
            Graduated Friction Ladder · L0 to L4
          </div>
        </div>
      </div>
    </AnimatedSection>
  )
}
