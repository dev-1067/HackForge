import React from 'react'
import { Link } from 'react-router-dom'
import { TrustJugglerLogo } from '@/components/ui/TrustJugglerLogo'

interface AuthShellProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, children, footer }) => (
  <div className="flex min-h-screen flex-col bg-background font-sans">
    <header className="px-5 py-4 sm:px-8">
      <Link to="/" className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md" aria-label="Trust Juggler home">
        <TrustJugglerLogo size={30} />
      </Link>
    </header>
    <main className="flex flex-1 items-start justify-center px-5 pb-12 pt-4 sm:items-center sm:pt-0">
      <div className="w-full max-w-[26rem]">
        <h1 className="text-app-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1.5 text-app-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6">{children}</div>
        {footer && <div className="mt-5 space-y-1.5 text-center text-app-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  </div>
)
