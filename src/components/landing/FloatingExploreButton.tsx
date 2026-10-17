import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Compass, ArrowRight, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

export const FloatingExploreButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const handleScroll = () => {
      // Show button once the user scrolls down a bit (> 120px)
      if (window.scrollY > 120) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    // Initial check
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!isVisible) return null

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 15 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 15 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed bottom-6 right-6 z-40 select-none"
    >
      <Link
        to="/dashboard"
        className={cn(
          'group relative flex items-center gap-2.5 px-4 py-3 rounded-full text-xs font-mono font-bold tracking-tight',
          'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-500/30',
          'border border-white/20 backdrop-blur-md',
          'hover:shadow-2xl hover:shadow-blue-500/50 hover:brightness-110 hover:-translate-y-1',
          'active:translate-y-0 active:scale-95 transition-all duration-200'
        )}
        title="Open the working Trust Juggler Live Operations Console"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>

        <span className="text-xs uppercase font-semibold">Let’s Explore</span>

        <ArrowRight className="w-3.5 h-3.5 text-white/90 group-hover:translate-x-1 transition-transform" />
      </Link>
    </motion.div>
  )
}
