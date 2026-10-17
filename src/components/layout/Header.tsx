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
    <header className="h-16 border-b border-border bg-card px-4 md:px-6 flex items-center justify-between gap-4 z-20">
      {/* View Title & Status */}
      <div className="flex items-center gap-3">
        <h1 className="text-base md:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
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

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search rider ID (e.g. RDR-8021), session, city, or zone..."
            className="w-full pl-9 pr-8 py-1.5 bg-secondary/60 text-foreground text-xs rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-sans placeholder:text-muted-foreground/70"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Control Actions & Theme Switcher */}
      <div className="flex items-center gap-2">
        {/* Stream Simulation Toggle */}
        <button
          onClick={onToggleStreaming}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono font-medium transition-colors',
            isStreaming
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
              : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
          )}
          title={isStreaming ? 'Pause simulated live stream' : 'Resume simulated live stream'}
        >
          {isStreaming ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Stream On</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Stream Paused</span>
            </>
          )}
        </button>

        {/* Manual Tick Generator for Demo */}
        <button
          onClick={onManualTick}
          className="p-1.5 rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          title="Simulate next live session event now"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="p-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
          )}
        </button>
      </div>
    </header>
  )
}
