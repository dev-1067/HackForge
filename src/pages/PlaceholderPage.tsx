import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, Sparkles } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  subtitle: string
  phase: string
  features: string[]
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  subtitle,
  phase,
  features,
}) => {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
      <div className="p-8 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {phase}
          </span>
          <span className="text-xs font-mono text-muted-foreground">DEVELOPER C TASK SCOPE</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>

        <div className="pt-4 border-t border-border">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Planned Features in Specification
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-border bg-secondary/30 text-foreground/80 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Live Command Center
          </Link>
        </div>
      </div>
    </div>
  )
}
