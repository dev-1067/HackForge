import React from 'react'
import { DecisionLevel } from '@/types'
import { cn } from '@/lib/utils'
import { Filter, Search } from 'lucide-react'

interface QuickFiltersProps {
  selectedLevel: DecisionLevel | 'ALL'
  onSelectLevel: (level: DecisionLevel | 'ALL') => void
  search: string
  onSearchChange: (search: string) => void
  totalCount: number
  filteredCount: number
  className?: string
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({
  selectedLevel,
  onSelectLevel,
  search,
  onSearchChange,
  totalCount,
  filteredCount,
  className,
}) => {
  const levels: Array<{ key: DecisionLevel | 'ALL'; label: string; countSuffix?: string }> = [
    { key: 'ALL', label: 'All Decisions' },
    { key: 'L0', label: 'L0 Allow' },
    { key: 'L1', label: 'L1 Watch' },
    { key: 'L2', label: 'L2 Step-up' },
    { key: 'L3', label: 'L3 Review' },
    { key: 'L4', label: 'L4 Suspend' },
  ]

  return (
    <div className={cn('flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-sans', className)}>
      {/* Decision Level Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {levels.map((lvl) => {
          const isSelected = selectedLevel === lvl.key
          return (
            <button
              key={lvl.key}
              onClick={() => onSelectLevel(lvl.key)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap focus:outline-none',
                isSelected
                  ? 'bg-[#0F3B2C] text-white shadow-xs dark:bg-emerald-600'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              {lvl.label}
            </button>
          )
        })}
      </div>

      {/* Filter Stats */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-auto font-sans">
        <span className="bg-secondary/60 px-3 py-1 rounded-full border border-border/60 text-[11px]">
          Showing <span className="font-semibold text-foreground">{filteredCount}</span> of {totalCount} sessions
        </span>
      </div>
    </div>
  )
}
