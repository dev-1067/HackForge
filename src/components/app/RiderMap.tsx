import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ops } from '@/api/endpoints'
import { Link, useNavigate } from 'react-router-dom'
import { SelectFilter } from '@/components/app/FilterBar'
import { useOps } from '@/components/app/OpsContext'
import { Panel } from '@/components/app/Panel'
import { CITY_CENTERS, placeOf } from '@/lib/geo'
import { STATUS_LABEL, whenText } from '@/lib/plain'
import { cn } from '@/lib/utils'
import type { MapRider } from '@/types/api'

const COLORS: Record<string, string> = {
  active: '#10b981', watch: '#3b82f6', pending_stepup: '#f59e0b', held: '#ef4444', suspended: '#7f1d1d',
}
const ATTENTION = new Set(['pending_stepup', 'held', 'suspended'])

/** Riders on a real map, placed by city and area. New sessions move or recolour a marker as they happen. */
export const RiderMap: React.FC = () => {
  const { recent, changeTick } = useOps()
  const navigate = useNavigate()
  const go = useRef(navigate)
  go.current = navigate
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const fitted = useRef('')
  const [riders, setRiders] = useState<Map<string, MapRider>>(new Map())
  const [city, setCity] = useState('')
  const [only, setOnly] = useState<'all' | 'attention'>('all')
  const [error, setError] = useState('')
  const [tilesFailed, setTilesFailed] = useState(false)
  const [pulse, setPulse] = useState<string[]>([])

  // real positions from the server: the latest session of every rider
  useEffect(() => {
    let live = true
    const load = () => ops.map().then((rows) => { if (live) { setRiders(new Map(rows.map((r) => [r.rider_id, r]))); setError('') } })
      .catch((e) => { if (live) setError((e as Error).message) })
    void load()
    const id = window.setInterval(load, 20000)
    return () => { live = false; window.clearInterval(id) }
  }, [changeTick])

  // live: the newest session of a rider replaces what we knew (city, area, status)
  useEffect(() => {
    if (recent.length === 0) return
    const touched: string[] = []
    setRiders((prev) => {
      const next = new Map(prev)
      for (const d of [...recent].reverse()) {
        const known = next.get(d.rider_id)
        const at = d.started_at ?? d.decided_at
        if (known && known.last_seen_at >= at && known.status === d.status) continue
        if (!d.context?.city) continue
        next.set(d.rider_id, { rider_id: d.rider_id, name: d.rider_name, status: d.status, city: d.context.city ?? null,
          zone: d.context.zone ?? null, last_seen_at: at, decision_level: d.level })
        touched.push(d.rider_id)
      }
      return touched.length ? next : prev
    })
    if (touched.length) {
      setPulse(touched.slice(-6))
      const t = window.setTimeout(() => setPulse([]), 1800)
      return () => window.clearTimeout(t)
    }
  }, [recent])

  const shown = useMemo(() => [...riders.values()].filter((r) =>
    (!city || r.city === city) && (only === 'all' || ATTENTION.has(r.status))), [riders, city, only])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of riders.values()) if (!city || r.city === city) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [riders, city])

  // create the map once
  useEffect(() => {
    if (!host.current || map.current) return
    const m = L.map(host.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView([21.5, 79], 4)
    let errors = 0
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).on('tileerror', () => { errors += 1; if (errors > 3) setTilesFailed(true) }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => { m.remove(); map.current = null; layer.current = null }
  }, [])

  // draw the markers
  useEffect(() => {
    const m = map.current, layerGroup = layer.current
    if (!m || !layerGroup) return
    layerGroup.clearLayers()
    const points: L.LatLngTuple[] = []
    if (!city) {
      // Zoomed out: one marker per city with the number of riders. Click it to look at that city.
      const byCity = new Map<string, MapRider[]>()
      for (const r of shown) if (r.city && CITY_CENTERS[r.city]) byCity.set(r.city, [...(byCity.get(r.city) ?? []), r])
      for (const [name, members] of byCity) {
        const at = CITY_CENTERS[name]
        points.push(at)
        const worst = ['suspended', 'held', 'pending_stepup', 'watch', 'active'].find((st) => members.some((g) => g.status === st)) ?? 'active'
        const flagged = members.filter((g) => ATTENTION.has(g.status)).length
        const marker = L.circleMarker(at, {
          radius: 12 + Math.min(14, Math.sqrt(members.length) * 3), color: '#ffffff', weight: 2.5, fillColor: COLORS[worst], fillOpacity: 0.9,
          className: flagged ? 'tj-map-alert' : undefined,
        })
        marker.bindTooltip(`${name} · ${members.length} rider${members.length === 1 ? '' : 's'}${flagged ? ` · ${flagged} need${flagged === 1 ? 's' : ''} attention` : ''}. Click to open.`, { direction: 'top' })
        marker.on('click', () => setCity(name))
        marker.addTo(layerGroup)
        const label = document.createElement('span'); label.textContent = String(members.length)
        L.marker(at, { interactive: false, icon: L.divIcon({ className: 'tj-map-count', html: label, iconSize: [30, 30] }) }).addTo(layerGroup)
        if (pulse.some((id) => members.some((g) => g.rider_id === id))) {
          L.circleMarker(at, { radius: 32, color: COLORS[worst], weight: 2, fill: false, className: 'tj-map-pulse', interactive: false }).addTo(layerGroup)
        }
      }
    } else {
      for (const r of shown) {
        const at = placeOf(r.city, r.zone, r.rider_id)
        if (!at) continue
        points.push(at)
        const color = COLORS[r.status] ?? COLORS.active
        const marker = L.circleMarker(at, {
          radius: ATTENTION.has(r.status) ? 9 : 6, color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 0.95,
          className: ATTENTION.has(r.status) ? 'tj-map-alert' : undefined,
        })
        const box = document.createElement('div')
        const title = document.createElement('strong'); title.textContent = r.name ?? `Rider ${r.rider_id}`
        const meta = document.createElement('div'); meta.textContent = `${STATUS_LABEL[r.status] ?? r.status} · ${[r.city, r.zone].filter(Boolean).join(' · ')}`
        const seen = document.createElement('div'); seen.textContent = `Last session ${whenText(r.last_seen_at)}`
        const link = document.createElement('a'); link.href = `/riders/${encodeURIComponent(r.rider_id)}`; link.textContent = 'Open rider'
        link.style.fontWeight = '600'; link.style.textDecoration = 'underline'
        link.addEventListener('click', (e) => { e.preventDefault(); go.current(`/riders/${encodeURIComponent(r.rider_id)}`) })
        box.append(title, meta, seen, link)
        marker.bindPopup(box)
        marker.bindTooltip(r.name ?? r.rider_id, { direction: 'top' })
        marker.addTo(layerGroup)
        if (pulse.includes(r.rider_id)) {
          L.circleMarker(at, { radius: 16, color, weight: 2, fill: false, className: 'tj-map-pulse', interactive: false }).addTo(layerGroup)
        }
      }
    }
    const key = city || 'all'
    if (points.length && fitted.current !== key) {
      fitted.current = key
      m.fitBounds(L.latLngBounds(points).pad(0.25), { maxZoom: city ? 11 : 6, animate: false })
    }
  }, [shown, city, pulse])

  // the container can change size when the layout does
  useEffect(() => {
    const m = map.current
    if (!m || !host.current) return
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(host.current)
    return () => ro.disconnect()
  }, [])

  const total = [...riders.values()].filter((r) => !city || r.city === city).length

  return (
    <Panel
      title="Riders on the map"
      note="Placed by city and area, not GPS. Click a city to zoom in, then a rider to open them."
      className="lg:col-span-2"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Show riders" className="inline-flex overflow-hidden rounded-lg border border-border text-app-13">
            {(['all', 'attention'] as const).map((key) => (
              <button key={key} type="button" aria-pressed={only === key} onClick={() => setOnly(key)}
                className={cn('px-3 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  only === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}>
                {key === 'all' ? 'All riders' : 'Needs attention'}
              </button>
            ))}
          </div>
          {city && <button type="button" onClick={() => setCity('')} className="rounded-lg border border-border px-3 py-1.5 text-app-13 font-medium text-foreground hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">All cities</button>}
          <SelectFilter label="City on the map" value={city} onChange={setCity} className="py-1.5 text-app-13"
            options={[{ value: '', label: 'All cities' }, ...Object.keys(CITY_CENTERS).map((c) => ({ value: c, label: c }))]} />
        </div>
      }
    >
      <div className="relative">
        <div ref={host} className="tj-map h-[340px] w-full overflow-hidden rounded-lg border border-border bg-secondary" role="region" aria-label="Map of riders" />
        {shown.length === 0 && !error && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-app-sm text-muted-foreground">
            {only === 'attention' ? 'No rider needs attention in this view.' : 'No riders to show yet.'}
          </p>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-app-13 text-rose-700 dark:text-rose-400">{error}</p>}
      {tilesFailed && <p className="mt-2 text-app-13 text-muted-foreground">Map background could not be loaded. Riders are still placed by city and area.</p>}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-app-13 text-muted-foreground" aria-label="Legend">
        {Object.keys(COLORS).map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[status] }} aria-hidden />
            {STATUS_LABEL[status]} <span className="font-medium text-foreground">{counts[status] ?? 0}</span>
          </li>
        ))}
        <li className="ml-auto">{shown.length} of {total} shown · <Link to="/riders" className="underline underline-offset-2">All riders</Link></li>
      </ul>
    </Panel>
  )
}
