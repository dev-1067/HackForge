import React from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronUp, LogOut } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
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
export const NavSidebar: React.FC<{ groups: NavGroup[]; label: string; onNavigate?: () => void }> = ({ groups, label, onNavigate }) => {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [loggingOut, setLoggingOut] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const displayName = user?.name ?? (user?.role === 'rider' ? 'Delivery Rider' : 'Organizer')
  const subtitle = user?.role === 'rider' ? (user?.rider_id ? `Rider ${user.rider_id}` : 'Delivery Partner') : 'Fleet Organizer'

  return (
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

      {/* User profile & Log out at bottom of sidebar */}
      <div ref={menuRef} className="relative border-t border-border p-2.5">
        {menuOpen && (
          <div className="absolute bottom-full left-2.5 right-2.5 mb-2 rounded-xl border border-border bg-popover p-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="border-b border-border/80 px-2.5 py-2 mb-1">
              <p className="truncate text-app-sm font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-app-xs text-muted-foreground">{subtitle}</p>
            </div>
            <button
              type="button"
              disabled={loggingOut}
              onClick={() => {
                setLoggingOut(true)
                void signOut().finally(() => {
                  setLoggingOut(false)
                  setMenuOpen(false)
                })
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-app-sm font-medium text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>{loggingOut ? 'Signing out...' : 'Log out'}</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          className="flex w-full items-center justify-between gap-2 rounded-lg p-2 text-left hover:bg-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs uppercase">
              {displayName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-app-sm font-medium text-foreground leading-tight">
                {displayName}
              </p>
              <p className="truncate text-app-xs text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </div>
          <div className={cn('rounded p-1 text-muted-foreground hover:text-foreground transition-transform duration-200', menuOpen && 'rotate-180')}>
            <ChevronUp className="h-4 w-4" />
          </div>
        </button>
      </div>
    </nav>
  )
}

