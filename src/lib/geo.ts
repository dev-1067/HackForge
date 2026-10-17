/** The demo data has no GPS: riders have a city and an area code (Z1 to Z60). Places on the map are worked out from those two. */
export const CITY_CENTERS: Record<string, [number, number]> = {
  Pune: [18.5204, 73.8567],
  Mumbai: [19.076, 72.8777],
  Bengaluru: [12.9716, 77.5946],
  Delhi: [28.6139, 77.209],
  Hyderabad: [17.385, 78.4867],
  Chennai: [13.0827, 80.2707],
  Kolkata: [22.5726, 88.3639],
  Ahmedabad: [23.0225, 72.5714],
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967295
}

/** Always the same spot for the same city, area and rider, so markers do not jump around. */
export function placeOf(city: string | null, zone: string | null, riderId: string): [number, number] | null {
  const center = city ? CITY_CENTERS[city] : undefined
  if (!center) return null
  const n = Number((zone ?? '').replace(/\D/g, '')) || Math.round(hash(zone ?? riderId) * 60)
  const angle = n * 2.399963
  const radius = 0.012 + 0.052 * ((n * 0.6180339) % 1)
  const jitterLat = (hash(riderId + 'a') - 0.5) * 0.008
  const jitterLng = (hash(riderId + 'b') - 0.5) * 0.008
  return [center[0] + radius * Math.sin(angle) + jitterLat, center[1] + (radius * Math.cos(angle)) / Math.cos((center[0] * Math.PI) / 180) + jitterLng]
}
