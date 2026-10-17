import React, { useEffect, useRef, useState } from 'react'

/** A number that eases up to its value the first time it appears. Shows the final value straight away if motion is reduced. */
export const CountUp: React.FC<{ value: number; format?: (n: number) => string }> = ({ value, format = (n) => Math.round(n).toLocaleString() }) => {
  const [shown, setShown] = useState(value)
  const from = useRef<number | null>(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return }
    const start = from.current ?? 0
    const t0 = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 700)
      setShown(start + (value - start) * (1 - Math.pow(1 - t, 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
      else from.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); from.current = value }
  }, [value])
  return <>{format(shown)}</>
}
