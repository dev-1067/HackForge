import React from 'react'
import { useTheme } from '@/hooks/useTheme'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { Moon, Sun, Play, Pause, Search, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  isStreaming: boolean
  onToggleStreaming: () => void
  onManualTick: () => void
  searchQuery: string
  onSearchChange: (val: string) => void
  title?: string
  lastSyncTime?: string
}

export const Header: React.FC<HeaderProps> = ({
  isStreaming,
  onToggleStreaming,
  onManualTick,
  searchQuery,
  onSearchChange,
  title = 'Live Command Center',
  lastSyncTime,
}) => {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="h-18 border-b border-border/70 bg-card px-4 md:px-6 flex items-center justify-between gap-4 z-20 font-sans">
      {/* View Title & Status */}
      <div className="flex items-center gap-3">
        <h1 className="text-base md:text-lg font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <div className="hidden lg:block">
          <StatusIndicator
            isLiveFeedActive={isStreaming}
            isMock={true}
            lastSyncTime={lastSyncTime}
          />
        </div>
      </div>

      {/* Global Search Bar (Modern Rounded Pill Input) */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search rider ID (e.g. RDR-8021), device, or zone..."
            className="w-full pl-10 pr-8 py-2 bg-secondary/50 text-foreground text-xs rounded-full border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-sans placeholder:text-muted-foreground/70"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Control Actions & Theme Switcher */}
      <div className="flex items-center gap-2.5">
        {/* Stream Simulation Toggle */}
        <button
          onClick={onToggleStreaming}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shadow-2xs',
            isStreaming
              ? 'bg-[#0F3B2C] text-white border-[#0F3B2C] hover:bg-[#16533E] dark:bg-emerald-600 dark:border-emerald-500'
              : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
          )}
          title={isStreaming ? 'Pause simulated stream' : 'Resume simulated stream'}
        >
          {isStreaming ? (
            <>
              <Pause className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">Feed Active</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">Feed Paused</span>
            </>
          )}
        </button>

        {/* Manual Event Trigger */}
        <button
          onClick={onManualTick}
          className="p-2 rounded-full border border-border/80 bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shadow-2xs"
          title="Simulate next session event"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="p-2 rounded-full border border-border/80 bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shadow-2xs"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>
    </header>
  )
}
