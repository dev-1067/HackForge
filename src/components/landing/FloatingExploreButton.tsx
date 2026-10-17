import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

export const FloatingExploreButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 120) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!isVisible) return null

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 12 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed bottom-6 right-6 z-40 select-none font-sans"
    >
      <Link
        to="/dashboard"
        className={cn(
          'group relative flex items-center gap-2.5 px-5 py-2.5 rounded-full text-xs font-semibold',
          'bg-[#0F3B2C] hover:bg-[#16533E] text-white shadow-xl shadow-black/15',
          'border border-white/15 backdrop-blur-md',
          'hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200'
        )}
        title="Open the Trust Juggler Operations Console"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#84CC16] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#84CC16]" />
        </span>

        <span>Operations Console</span>
        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
      </Link>
    </motion.div>
  )
}
