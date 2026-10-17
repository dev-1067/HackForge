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
    <div className={cn('flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3', className)}>
      {/* Decision Level Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1 font-mono">
          <Filter className="w-3 h-3" />
          Filter:
        </span>
        {levels.map((lvl) => {
          const isSelected = selectedLevel === lvl.key
          return (
            <button
              key={lvl.key}
              onClick={() => onSelectLevel(lvl.key)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-mono font-medium transition-all whitespace-nowrap',
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              {lvl.label}
            </button>
          )
        })}
      </div>

      {/* Filter Stats & Search input for mobile/inline */}
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground self-end sm:self-auto">
        <span className="bg-secondary px-2 py-0.5 rounded border border-border">
          Showing <span className="font-semibold text-foreground">{filteredCount}</span> of {totalCount} sessions
        </span>
      </div>
    </div>
  )
}
