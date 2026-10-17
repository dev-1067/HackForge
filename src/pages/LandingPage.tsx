import React from 'react'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { HeroSection } from '@/components/landing/HeroSection'
import { GateComparisonSection } from '@/components/landing/GateComparisonSection'
import { DecoupledMatrixSection } from '@/components/landing/DecoupledMatrixSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { InteractiveDemoSection } from '@/components/landing/InteractiveDemoSection'
import { TrustSafetySection } from '@/components/landing/TrustSafetySection'
import { FinalCtaSection } from '@/components/landing/FinalCtaSection'
import { FloatingExploreButton } from '@/components/landing/FloatingExploreButton'

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-blue-600/30 selection:text-blue-200">
      {/* Sticky Header */}
      <LandingHeader />

      {/* Main Content Sections */}
      <main>
        {/* 1. Hero with headline & animated decoupled risk graphic */}
        <HeroSection />

        {/* 2. Problem: Strict Gate vs. Open Gate */}
        <GateComparisonSection />

        {/* 3. The Decoupled Breakthrough & Interactive 2x2 Matrix */}
        <DecoupledMatrixSection />

        {/* 4. How It Works 4-stage connected process */}
        <HowItWorksSection />

        {/* 5. Interactive Simulation Lab Demo */}
        <InteractiveDemoSection />

        {/* 6. Rigorous Trust & Safety Architecture */}
        <TrustSafetySection />

        {/* 7. Final Call to Action & Team Credits */}
        <FinalCtaSection />
      </main>

      {/* Persistent Floating Action Button ("Let's Explore") */}
      <FloatingExploreButton />
    </div>
  )
}

export default LandingPage
