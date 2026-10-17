/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        navy: {
          950: '#0B1120',
          900: '#0F172A',
          850: '#111827',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
        },
        risk: {
          l0: '#10B981', // Allow / Green
          l1: '#3B82F6', // Watch / Blue
          l2: '#F59E0B', // Step-up / Amber
          l3: '#EF4444', // Manual review / Red
          l4: '#7F1D1D', // Suspend / Dark Crimson
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Sizes for the signed-in app. They follow the person's text-size setting (--tj-scale);
      // the public landing page keeps using the standard Tailwind sizes and is unaffected.
      fontSize: {
        'app-xs': ['calc(0.75rem * var(--tj-scale, 1.08))', '1.45'],
        'app-13': ['calc(0.8125rem * var(--tj-scale, 1.08))', '1.45'],
        'app-sm': ['calc(0.875rem * var(--tj-scale, 1.08))', '1.5'],
        'app-15': ['calc(0.9375rem * var(--tj-scale, 1.08))', '1.45'],
        'app-base': ['calc(1rem * var(--tj-scale, 1.08))', '1.5'],
        'app-lg': ['calc(1.125rem * var(--tj-scale, 1.08))', '1.35'],
        'app-xl': ['calc(1.25rem * var(--tj-scale, 1.08))', '1.3'],
        'app-2xl': ['calc(1.5rem * var(--tj-scale, 1.08))', '1.25'],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
