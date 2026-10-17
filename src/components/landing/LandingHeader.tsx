import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { TrustJugglerLogo } from '@/components/ui/TrustJugglerLogo'
import { Moon, Sun, Menu, X } from 'lucide-react'

export const LandingHeader: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '#problem', label: 'The Problem' },
    { href: '#approach', label: 'Our Approach' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#demo', label: 'Interactive Demo' },
    { href: '#safety', label: 'Trust & Safety' },
  ]

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-md transition-colors font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo & Wordmark (Delivery Verify Theme) */}
        <Link to="/" className="group flex items-center gap-3 focus:outline-none">
          <TrustJugglerLogo size={34} showWordmark={true} />
        </Link>

        {/* Desktop Navigation (Modern Paydo Capsule Pill Dock) */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-secondary/60 border border-border/70 shadow-2xs backdrop-blur-xs">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/90 transition-all duration-150"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Actions Cluster */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Subtle Theme Toggle Circle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-10 h-10 rounded-full border border-border/70 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-all duration-150 shadow-2xs focus:outline-none"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Primary Action Button (Operations Console Pill) */}
          <Link
            to="/dashboard"
            className="group inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-[#0F3B2C] hover:bg-[#16533E] text-white font-medium text-xs sm:text-[13px] tracking-normal transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-none"
          >
            <span>Operations Console</span>
            <span className="text-xs transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 rounded-full border border-border/70 bg-secondary/50 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors focus:outline-none"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border/80 bg-background/95 backdrop-blur-lg px-4 pt-3 pb-5 space-y-1.5 animate-in slide-in-from-top-2 duration-150 shadow-lg">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="block px-3.5 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3">
            <Link
              to="/dashboard"
              className="flex items-center justify-center gap-2 w-full h-11 rounded-full bg-[#0F3B2C] hover:bg-[#16533E] text-white text-xs font-semibold shadow-sm transition-all"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Operations Console</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
