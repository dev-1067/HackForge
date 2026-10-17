import React from 'react'
import { DecisionLevel, RiskLevel } from '@/types'
import { DECISION_METADATA } from '@/data/mockData'
import { cn } from '@/lib/utils'
import { ShieldCheck, Eye, ShieldAlert, AlertTriangle, Ban } from 'lucide-react'

interface RiskBadgeProps {
  decision: DecisionLevel
  riskLevel?: RiskLevel
  showAction?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  decision,
  showAction = false,
  className,
  size = 'md',
}) => {
  const meta = DECISION_METADATA[decision] || DECISION_METADATA.L0

  const getIcon = () => {
    switch (decision) {
      case 'L0':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      case 'L1':
        return <Eye className="w-3.5 h-3.5 text-blue-500 shrink-0" />
      case 'L2':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      case 'L3':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
      case 'L4':
        return <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" />
    }
  }

  const getVariantStyles = () => {
    switch (decision) {
      case 'L0':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
      case 'L1':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
      case 'L2':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
      case 'L3':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
      case 'L4':
        return 'bg-red-700/15 text-red-700 dark:text-red-400 border-red-600/30'
    }
  }

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size]

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md border font-mono tracking-tight transition-colors',
        getVariantStyles(),
        sizeStyles,
        className
      )}
      title={`${meta.label}: ${meta.description}`}
    >
      {getIcon()}
      <span className="font-semibold">{meta.code}</span>
      <span className="opacity-80 font-sans">{meta.label}</span>
      {showAction && (
        <span className="hidden sm:inline border-l border-current/20 pl-1.5 ml-0.5 text-[10px] uppercase font-mono tracking-wider opacity-75">
          {meta.action}
        </span>
      )}
    </span>
  )
}
