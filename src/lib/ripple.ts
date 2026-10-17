/** A small ripple where a button is pressed. One listener for the whole app; off when motion is reduced. */
export function installRipple(): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  function onDown(event: PointerEvent) {
    if (reduced.matches || event.button !== 0) return
    const target = (event.target as Element | null)?.closest<HTMLElement>('button, a.tj-press, a[class*="bg-"][class*="rounded"], [role="button"]')
    if (!target || (target as HTMLButtonElement).disabled) return
    const style = getComputedStyle(target)
    if (style.position === 'absolute' || style.position === 'fixed' || style.position === 'sticky') return
    if (style.position === 'static') target.style.position = 'relative'
    if (style.overflow === 'visible') target.style.overflow = 'hidden'
    const rect = target.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const dot = document.createElement('span')
    dot.className = 'tj-ripple'
    dot.setAttribute('aria-hidden', 'true')
    dot.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px`
    target.appendChild(dot)
    window.setTimeout(() => dot.remove(), 600)
  }
  document.addEventListener('pointerdown', onDown, { passive: true })
  return () => document.removeEventListener('pointerdown', onDown)
}
