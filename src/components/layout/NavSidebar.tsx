import React from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { TrustJugglerLogo } from '@/components/ui/TrustJugglerLogo'

export interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
  /** A count shown at the right (company: open cases). */
  count?: number
  /** A small amber dot meaning "something needs you here". */
  attention?: boolean
}

export interface NavGroup {
  heading?: string
  items: NavItem[]
}

/** Sidebar shared by the company dashboard and the delivery partner portal. Each role passes its own items. */
export const NavSidebar: React.FC<{ groups: NavGroup[]; label: string; onNavigate?: () => void }> = ({ groups, label, onNavigate }) => (
  <nav aria-label={label} className="flex h-full w-60 flex-col border-r border-border bg-card font-sans">
    <div className="flex h-14 items-center border-b border-border px-4">
      <NavLink to="/" className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Trust Juggler home">
        <TrustJugglerLogo size={28} />
      </NavLink>
    </div>
    <div className="flex-1 space-y-5 overflow-y-auto p-3">
      {groups.map((group, index) => (
        <div key={group.heading ?? index}>
          {group.heading && <p className="px-3 pb-1.5 text-app-xs font-medium text-muted-foreground">{group.heading}</p>}
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-app-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.count ? (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-app-xs font-semibold text-amber-800 dark:text-amber-300" aria-label={`${item.count} open`}>
                    {item.count}
                  </span>
                ) : null}
                {item.attention && <span className="h-2 w-2 rounded-full bg-amber-500" role="img" aria-label="Needs your attention" />}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  </nav>
)
