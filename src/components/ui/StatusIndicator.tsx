import React from 'react'
import { cn } from '@/lib/utils'
import { Activity, Radio } from 'lucide-react'

interface StatusIndicatorProps {
  isLiveFeedActive?: boolean
  isMock?: boolean
  className?: string
  lastSyncTime?: string
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isLiveFeedActive = true,
  isMock = true,
  className,
  lastSyncTime,
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono backdrop-blur-sm',
        isMock
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            isLiveFeedActive
              ? isMock
                ? 'bg-amber-500 animate-status-pulse'
                : 'bg-emerald-500 animate-status-pulse'
              : 'bg-slate-400'
          )}
        />
        {isLiveFeedActive && (
          <span
            className={cn(
              'absolute w-3.5 h-3.5 rounded-full opacity-40 animate-ping',
              isMock ? 'bg-amber-400' : 'bg-emerald-400'
            )}
          />
        )}
      </div>

      <div className="flex items-center gap-1.5 font-medium text-[11px] font-sans">
        <span>{isLiveFeedActive ? (isMock ? 'Simulated Feed Active' : 'Live Feed Active') : 'Feed Paused'}</span>
      </div>

      {lastSyncTime && (
        <span className="hidden md:inline text-[10px] opacity-70 border-l border-current/20 pl-2 font-mono">
          {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </div>
  )
}
