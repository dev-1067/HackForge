import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  SlidersHorizontal,
  BarChart3,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrustJugglerLogo } from '@/components/ui/TrustJugglerLogo'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  badgeColor?: string
}

interface NavGroup {
  group: string
  items: NavItem[]
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const navGroups: NavGroup[] = [
    {
      group: 'OPERATIONS',
      items: [
        {
          to: '/dashboard',
          label: 'Live Console',
          icon: LayoutDashboard,
          badge: 'LIVE',
          badgeColor: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        },
        {
          to: '/review-queue',
          label: 'Review Queue',
          icon: ClipboardList,
          badge: '4 cases',
          badgeColor: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
        },
        {
          to: '/audit',
          label: 'Audit Trail',
          icon: FileText,
          badge: 'Ledger',
          badgeColor: 'bg-secondary text-muted-foreground',
        },
      ],
    },
    {
      group: 'INVESTIGATION',
      items: [
        {
          to: '/riders',
          label: 'Rider Profiles',
          icon: Users,
          badge: 'Dossier',
          badgeColor: 'bg-secondary text-muted-foreground',
        },
        {
          to: '/simulation',
          label: 'Simulation Lab',
          icon: SlidersHorizontal,
          badge: '14 labs',
          badgeColor: 'bg-[#0F3B2C]/10 text-[#0F3B2C] dark:bg-emerald-500/20 dark:text-emerald-300',
        },
        {
          to: '/analytics',
          label: 'Trade-off Analytics',
          icon: BarChart3,
          badge: 'Pareto',
          badgeColor: 'bg-secondary text-muted-foreground',
        },
      ],
    },
    {
      group: 'SYSTEM',
      items: [
        {
          to: '/',
          label: 'Public Overview',
          icon: ArrowUpRight,
        },
      ],
    },
  ]

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border/80 bg-card transition-all duration-300 z-30 select-none shrink-0 font-sans',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-18 flex items-center px-4 border-b border-border/70 justify-between">
        <NavLink to="/" className="flex items-center gap-3 overflow-hidden group focus:outline-none">
          <TrustJugglerLogo size={32} showWordmark={!collapsed} markOnly={collapsed} />
        </NavLink>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus:outline-none"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.group}
              </div>
            )}

            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all group relative',
                      isActive
                        ? 'bg-[#0F3B2C] text-white shadow-xs dark:bg-emerald-600/20 dark:text-emerald-300 dark:border dark:border-emerald-500/30'
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
                          isActive
                            ? 'text-white dark:text-emerald-300'
                            : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      />

                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full font-medium truncate ml-1',
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : item.badgeColor || 'bg-secondary text-muted-foreground'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Decoupled Principle Box */}
      {!collapsed && (
        <div className="mx-3 mb-3 p-3.5 rounded-xl border border-border/80 bg-secondary/30 text-xs space-y-2">
          <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F3B2C] dark:text-emerald-400" />
            <span>Decoupled Logic</span>
          </div>
          <div className="text-[11px] text-muted-foreground space-y-1">
            <div className="flex justify-between items-center">
              <span>Context:</span>
              <span className="font-medium text-emerald-700 dark:text-emerald-300">Device/Location (Allow)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Habit:</span>
              <span className="font-medium text-amber-700 dark:text-amber-300">Kinetic Cadence (Review)</span>
            </div>
          </div>
        </div>
      )}

      {/* Operator Session Info Footer */}
      <div className="p-3 border-t border-border/70 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#0F3B2C] text-white flex items-center justify-center text-xs font-bold shrink-0">
              TJ
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">Operations Console</span>
              <span className="text-[10px] text-muted-foreground truncate">Fleet Identity Monitor</span>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div
              className="w-8 h-8 rounded-full bg-[#0F3B2C] text-white flex items-center justify-center text-xs font-bold"
              title="Operations Console"
            >
              TJ
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
