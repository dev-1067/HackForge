import React from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from './AuthShell'

const OPTIONS = [
  { to: '/rider/login', title: 'I am a delivery partner', text: 'See how your account is doing and confirm it is you when asked.' },
  { to: '/company/login', title: 'I work for the company', text: 'Review rider activity and the cases that need a closer look.' },
]

export const ChooseRole: React.FC = () => (
  <AuthShell title="Sign in" subtitle="Choose the option that describes you.">
    <ul className="space-y-3">
      {OPTIONS.map((option) => (
        <li key={option.to}>
          <Link
            to={option.to}
            className="block rounded-lg border border-border px-4 py-3 transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="block text-app-sm font-semibold text-foreground">{option.title}</span>
            <span className="mt-0.5 block text-app-13 text-muted-foreground">{option.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  </AuthShell>
)
