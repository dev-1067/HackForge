import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type TextSize = 'standard' | 'comfortable' | 'large'
export const TEXT_SIZES: Array<{ value: TextSize; label: string }> = [
  { value: 'standard', label: 'Standard' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'large', label: 'Large' },
]

const KEY = 'trust-juggler-text-size'

function read(): TextSize {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'standard' || saved === 'comfortable' || saved === 'large') return saved
  } catch { /* storage may be blocked; fall back to the default */ }
  return 'comfortable'
}

interface PreferencesValue {
  textSize: TextSize
  setTextSize: (size: TextSize) => void
}

const PreferencesContext = createContext<PreferencesValue | undefined>(undefined)

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>(read)

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize
    try { localStorage.setItem(KEY, textSize) } catch { /* ignore */ }
  }, [textSize])

  const value = useMemo(() => ({ textSize, setTextSize: setTextSizeState }), [textSize])
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider')
  return ctx
}
