import React from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart3, ClipboardList, FlaskConical, History, LayoutDashboard, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrustJugglerLogo } from '@/components/ui/TrustJugglerLogo'
import { useOps } from '@/components/app/OpsContext'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/review-queue', label: 'Needs review', icon: ClipboardList },
  { to: '/riders', label: 'Riders', icon: Users },
  { to: '/audit', label: 'History', icon: History },
]

const MORE: NavItem[] = [
  { to: '/simulation', label: 'Demo lab', icon: FlaskConical },
  { to: '/analytics', label: 'How it compares', icon: BarChart3 },
]

export const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { summary } = useOps()
  const open = summary?.open_cases ?? 0

  const link = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.to === '/review-queue' && open > 0 && (
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300" aria-label={`${open} open`}>
          {open}
        </span>
      )}
    </NavLink>
  )

  return (
    <nav aria-label="Main" className="flex h-full w-60 flex-col border-r border-border bg-card font-sans">
      <div className="flex h-14 items-center border-b border-border px-4">
        <NavLink to="/" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md" aria-label="Trust Juggler home">
          <TrustJugglerLogo size={28} />
        </NavLink>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-3">
        <div className="space-y-1">{NAV.map(link)}</div>
        <div>
          <p className="px-3 pb-1.5 text-xs font-medium text-muted-foreground">Explore</p>
          <div className="space-y-1">{MORE.map(link)}</div>
        </div>
      </div>
    </nav>
  )
}
