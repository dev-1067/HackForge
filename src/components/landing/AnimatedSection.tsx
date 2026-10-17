import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

interface AnimatedSectionProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  threshold?: number
  id?: string
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className,
  delay = 0,
  direction = 'up',
  threshold = 0.15,
  id,
}) => {
  const shouldReduceMotion = useReducedMotion()

  const getInitialPosition = () => {
    if (shouldReduceMotion || direction === 'none') return { opacity: 0 }
    switch (direction) {
      case 'up':
        return { opacity: 0, y: 28 }
      case 'down':
        return { opacity: 0, y: -28 }
      case 'left':
        return { opacity: 0, x: 28 }
      case 'right':
        return { opacity: 0, x: -28 }
    }
  }

  const getAnimatePosition = () => {
    if (shouldReduceMotion || direction === 'none') return { opacity: 1 }
    return { opacity: 1, x: 0, y: 0 }
  }

  return (
    <motion.section
      id={id}
      initial={getInitialPosition()}
      whileInView={getAnimatePosition()}
      viewport={{ once: true, amount: threshold }}
      transition={{
        duration: shouldReduceMotion ? 0.2 : 0.55,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={cn('relative', className)}
    >
      {children}
    </motion.section>
  )
}
