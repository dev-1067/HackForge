import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  ShieldAlert,
  Activity,
  Users,
  Sliders,
  Scale,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const navItems = [
    {
      to: '/',
      label: 'Live Command Center',
      shortLabel: 'Live',
      icon: Activity,
      badge: 'LIVE',
      badgeColor: 'bg-emerald-500/20 text-emerald-400',
    },
    {
      to: '/riders',
      label: 'Riders Investigation',
      shortLabel: 'Riders',
      icon: Users,
      badge: '3 under watch',
    },
    {
      to: '/simulation',
      label: 'Simulation Lab',
      shortLabel: 'Sim Lab',
      icon: Sliders,
    },
    {
      to: '/analytics',
      label: 'Trade-off Analytics',
      shortLabel: 'Analytics',
      icon: Scale,
    },
    {
      to: '/review-queue',
      label: 'Review Queue',
      shortLabel: 'Queue',
      icon: ListTodo,
      badge: '4 pending',
      badgeColor: 'bg-rose-500/20 text-rose-400',
    },
  ]

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border bg-card transition-all duration-300 z-30 select-none shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-border justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-blue-600/10 dark:bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Fingerprint className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-foreground truncate flex items-center gap-1.5">
                Trust Juggler
                <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                  v0.1
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono tracking-wider truncate">
                CONTINUOUS IDENTITY
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
            Operations Console
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group relative',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold dark:bg-blue-600/15 dark:text-blue-400'
                    : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-primary dark:text-blue-400' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />

                  {!collapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            'text-[10px] font-mono px-1.5 py-0.5 rounded font-medium truncate ml-1',
                            item.badgeColor || 'bg-secondary text-muted-foreground'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Core Split Pill */}
      {!collapsed && (
        <div className="mx-3 mb-4 p-3 rounded-lg border border-border bg-secondary/40 text-[11px] space-y-1.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-blue-500" />
            Decoupled Principle
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Context:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">Life events (allow)</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Habit:</span>
            <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">Handoffs (escalate)</span>
          </div>
        </div>
      )}

      {/* Team Info / Footer */}
      <div className="p-3 border-t border-border flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-mono font-bold">
              C
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-foreground truncate">Dev C (Frontend)</span>
              <span className="text-[10px] text-muted-foreground font-mono truncate">Hackathon Mode</span>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-mono font-bold" title="Dev C (Frontend)">
              C
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
