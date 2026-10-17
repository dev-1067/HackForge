import React from 'react'
import { Link } from 'react-router-dom'
import { AnimatedSection } from './AnimatedSection'
import { TrustJugglerLogo } from '@/components/ui/TrustJugglerLogo'

export const FinalCtaSection: React.FC = () => {
  return (
    <AnimatedSection className="py-20 md:py-28 border-t border-border/70 relative overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Main CTA Container (Signature Paydo Deep Forest Green Container) */}
        <div className="p-8 sm:p-12 md:p-16 rounded-3xl bg-[#0F3B2C] text-white shadow-2xl text-center space-y-6 max-w-4xl mx-auto border border-[#16533E]">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-[#D4F469] text-xs font-semibold border border-white/15">
            <span>Safer delivery accounts</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Protect honest riders.{' '}
            <span className="text-[#D4F469] block sm:inline">
              Make account sharing harder to hide.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl mx-auto font-normal">
            See how a more thoughtful approach to identity checks can reduce unnecessary interruptions while flagging sessions that deserve a closer look.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-white hover:bg-white/90 text-[#0F3B2C] font-semibold text-sm shadow-md transition-all active:scale-95"
            >
              <span>Open Operations Console</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Minimal Footer with Project-Related Principles (Replaces section nav list) */}
        <footer className="pt-8 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground font-sans">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3">
            <TrustJugglerLogo size={26} showWordmark={true} />
          </div>

          {/* Project-Related Principles Row (Restrained, subtle dots) */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-medium">
            <span className="hover:text-foreground transition-colors">Context-aware checks</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="hover:text-foreground transition-colors">Rider-first protection</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="hover:text-foreground transition-colors">Behavior over device</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="hover:text-foreground transition-colors">Evidence across sessions</span>
          </div>

          {/* Concise Context Note */}
          <div className="text-muted-foreground/70 text-[11px] text-center md:text-right">
            Real-time identity verification designed for delivery platforms.
          </div>
        </footer>
      </div>
    </AnimatedSection>
  )
}
