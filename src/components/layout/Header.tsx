import React from 'react'
import { Menu, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'

/** Top bar for every signed-in page. ``status`` is an optional note next to the title (e.g. "Live"). */
export const Header: React.FC<{ title: string; onMenu: () => void; status?: React.ReactNode }> = ({ title, onMenu, status }) => {
  const { theme, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = React.useState(false)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 font-sans md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenu}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-app-lg font-semibold text-foreground">{title}</h1>
        {status}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-app-sm text-muted-foreground md:inline">{user?.name}</span>
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <Button
          variant="secondary"
          size="sm"
          loading={signingOut}
          onClick={() => { setSigningOut(true); void signOut().finally(() => setSigningOut(false)) }}
        >
          Sign out
        </Button>
      </div>
    </header>
  )
}
