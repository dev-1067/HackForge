import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Fingerprint, Activity, Radio, ExternalLink, ShieldCheck } from 'lucide-react'
import { AnimatedSection } from './AnimatedSection'

export const FinalCtaSection: React.FC = () => {
  return (
    <AnimatedSection className="py-20 md:py-28 border-t border-border/60 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Main CTA Container */}
        <div className="p-8 sm:p-12 md:p-16 rounded-3xl border border-blue-500/30 bg-card/90 shadow-2xl text-center space-y-6 max-w-4xl mx-auto relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            READY FOR LIVE OPERATIONS EVALUATION
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground font-sans leading-tight">
            Trust the rider.{' '}
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 bg-clip-text text-transparent">
              Question the handoff.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans max-w-2xl mx-auto">
            Experience the real-time simulation feed, test live telemetry challenges, and inspect the
            continuous decoupled identity engine in action.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 font-mono text-xs">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <Radio className="w-4 h-4 text-blue-200 animate-pulse" />
              <span>Launch Live Operations Console</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Footer info & Hackathon team split */}
        <footer className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-foreground">Trust Juggler</span>
            <span>· HackForge 24h Hackathon Project</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span>Developer C: Frontend & Ops Console</span>
            <span className="opacity-40">|</span>
            <span>Developer A: Identity Engine & Sim</span>
            <span className="opacity-40">|</span>
            <span>Developer B: FastAPI & DB</span>
          </div>
        </footer>
      </div>
    </AnimatedSection>
  )
}
