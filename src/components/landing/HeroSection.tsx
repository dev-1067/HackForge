import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

export const HeroSection: React.FC = () => {
  const [previewMode, setPreviewMode] = useState<'new_phone' | 'handoff'>('new_phone')
  const isNewPhone = previewMode === 'new_phone'
  const shouldReduceMotion = useReducedMotion()

  const scrollToHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const element = document.querySelector('#how-it-works')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative pt-12 pb-16 md:pt-20 md:pb-28 overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Text Content with Paydo Centered / Editorial Flow */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="max-w-3xl space-y-6"
        >
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F3B2C]/10 text-[#0F3B2C] dark:text-emerald-300 dark:bg-emerald-950/40 text-xs font-medium border border-[#0F3B2C]/15">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span>Identity protection for delivery platforms</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            A new phone shouldn’t make an honest rider suspicious.
          </h1>

          {/* Supporting Copy */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl font-normal">
            Trust Juggler looks at how an account is being used—not just where it is being used.
            Spot possible account sharing without repeatedly troubling genuine delivery riders.
          </p>

          {/* Paydo-style Rounded Pill CTA Buttons (No icons, pure clean text) */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[#0F3B2C] hover:bg-[#16533E] text-white font-medium text-sm tracking-normal transition-all shadow-sm"
            >
              <span>Open Operations Console</span>
              <span className="ml-2">→</span>
            </Link>

            <a
              href="#how-it-works"
              onClick={scrollToHowItWorks}
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm transition-all"
            >
              <span>How It Works</span>
            </a>
          </div>

          {/* Supporting microcopy */}
          <p className="text-xs text-muted-foreground">
            Fairer checks • Clearer decisions • Fewer unnecessary interruptions
          </p>
        </motion.div>

        {/* Hero Visual Composition: Authentic Courier Image + Paydo-style Clean Inspection Card */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2"
        >
          {/* Left: Authentic Courier Editorial Photo */}
          <div className="lg:col-span-7 relative">
            <div className="relative rounded-3xl overflow-hidden border border-border shadow-md bg-card">
              <img
                src="/rider_courier.jpg"
                alt="Delivery courier pausing on a city street corner checking an order on their smartphone"
                className="w-full h-[360px] sm:h-[420px] md:h-[460px] object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              {/* Photo Caption Overlay */}
              <div className="absolute bottom-5 left-5 right-5 text-white text-xs space-y-1">
                <div className="font-semibold text-white/95 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#84CC16]" />
                  <span>Marcus Chen • Camden Town, London</span>
                </div>
                <div className="text-white/80 text-xs">
                  Active rider for 18 months. Just logged in from a newly purchased smartphone.
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Identity Verification Inspection Card (Clean Paydo styling, completely icon-free) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 sm:p-7 rounded-3xl border border-border bg-card shadow-md space-y-5">
              {/* Card Header & Scenario Switcher */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Live Session Inspection
                  </span>
                  <div className="font-bold text-sm text-foreground">Session #sess_9941a7</div>
                </div>

                {/* Scenario Toggle (Pill style) */}
                <div className="flex p-1 rounded-full bg-secondary border border-border text-xs">
                  <button
                    onClick={() => setPreviewMode('new_phone')}
                    className={cn(
                      'px-3 py-1 rounded-full transition-colors font-medium',
                      isNewPhone
                        ? 'bg-card text-foreground font-semibold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    New Phone
                  </button>
                  <button
                    onClick={() => setPreviewMode('handoff')}
                    className={cn(
                      'px-3 py-1 rounded-full transition-colors font-medium',
                      !isNewPhone
                        ? 'bg-card text-foreground font-semibold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Handoff
                  </button>
                </div>
              </div>

              {/* Two Signal Streams (Zero Icons, Pure Typographic Elegance) */}
              <div className="space-y-3.5 text-xs">
                {/* 1. Context Stream */}
                <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      Phone & Location
                    </span>
                    <span className={cn('font-semibold px-2 py-0.5 rounded-full text-[11px]', isNewPhone ? 'bg-[#0F3B2C]/10 text-[#0F3B2C] dark:text-emerald-300' : 'text-foreground')}>
                      {isNewPhone ? 'New Device Detected' : 'Registered Device'}
                    </span>
                  </div>
                  <div className="text-foreground text-xs leading-relaxed font-normal">
                    {isNewPhone
                      ? 'Samsung Galaxy S24 Ultra • Vodafone 5G (First shift on this hardware)'
                      : 'iPhone 13 Pro • EE Mobile (Familiar device & cellular network)'}
                  </div>
                </div>

                {/* 2. Habit Stream */}
                <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      Delivery Behavior
                    </span>
                    <span
                      className={cn(
                        'font-semibold px-2.5 py-0.5 rounded-full text-[11px]',
                        !isNewPhone
                          ? 'bg-[#0F3B2C]/10 text-[#0F3B2C] dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                      )}
                    >
                      {!isNewPhone ? 'Behavior Shifted' : 'Matches Usual Pattern'}
                    </span>
                  </div>
                  <div className="text-foreground text-xs leading-relaxed font-normal">
                    {!isNewPhone
                      ? 'Acceptance delay 14.8s (usually 3.2s) • Swipe timing shifted significantly across 4 deliveries.'
                      : 'Acceptance delay 3.4s • Swipe cadence and route choice match 30-day baseline.'}
                  </div>
                </div>
              </div>

              {/* Outcome Banner (Cohesive Green Aesthetic) */}
              <AnimatePresence mode="wait">
                {isNewPhone ? (
                  <motion.div
                    key="allow"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="p-4 rounded-2xl border border-emerald-500/30 bg-[#0F3B2C]/5 space-y-1"
                  >
                    <div className="text-[#0F3B2C] dark:text-emerald-400 font-bold text-xs">
                      Allow Session • Legitimate Life Change
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed font-normal">
                      The phone is new, but delivery habits match Marcus. Zero friction. No lockout.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="stepup"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="p-4 rounded-2xl border border-[#0F3B2C]/20 dark:border-emerald-700/40 bg-[#0F3B2C]/5 dark:bg-emerald-950/20 space-y-1"
                  >
                    <div className="text-[#0F3B2C] dark:text-emerald-300 font-bold text-xs">
                      Step-Up Verification Recommended
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed font-normal">
                      Same phone, but unusual hesitation and unfamiliar touch rhythm suggest a secondary driver.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
