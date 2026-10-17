import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Header } from './Header'

interface AppFrameProps {
  title: string
  status?: React.ReactNode
  /** Builds the sidebar; `close` is given when it is shown in the phone menu. */
  sidebar: (close?: () => void) => React.ReactNode
  children: React.ReactNode
}

/** Sidebar on large screens, a slide-in menu on phones, a header, and a scrolling page body. */
export const AppFrame: React.FC<AppFrameProps> = ({ title, status, sidebar, children }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="hidden lg:block">{sidebar()}</div>
      {menuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="relative">
            {sidebar(() => setMenuOpen(false))}
            <button onClick={() => setMenuOpen(false)} className="absolute right-2 top-3 rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="Close menu">
              <X className="h-4 w-4" />
            </button>
          </div>
          <button className="flex-1 bg-black/40" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
        </div>
      )}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Header title={title} status={status} onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
