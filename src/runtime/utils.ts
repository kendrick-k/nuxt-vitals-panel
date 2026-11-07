// Pure helpers (no DOM, no Nuxt): thresholds, ratings, formatting, report. Unit-tested in test/utils.test.ts.
export type VitalName = 'LCP' | 'FCP' | 'CLS' | 'INP' | 'TTFB'
export type VitalRating = 'good' | 'needs-improvement' | 'poor'

/** [good up to, poor above] in ms (CLS is unitless). Thresholds from web.dev. */
export const VITAL_THRESHOLDS: Record<VitalName, [number, number]> = {
  LCP: [2500, 4000],
  FCP: [1800, 3000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  TTFB: [800, 1800],
}

export function rateVital(name: VitalName, value: number | null | undefined): VitalRating | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  const [good, poor] = VITAL_THRESHOLDS[name]
  return value <= good ? 'good' : value > poor ? 'poor' : 'needs-improvement'
}

export function formatVital(name: VitalName, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  if (name === 'CLS') return value.toFixed(3)
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`
}

/** Worst rating among the measured vitals (null when nothing is measured yet). Drives the flame colour. */
export function overallRating(values: Partial<Record<VitalName, number | null>>): VitalRating | null {
  const order: VitalRating[] = ['good', 'needs-improvement', 'poor']
  let worst = -1
  for (const n of ['LCP', 'FCP', 'CLS', 'INP', 'TTFB'] as VitalName[]) {
    const r = rateVital(n, values[n])
    if (r) worst = Math.max(worst, order.indexOf(r))
  }
  return worst < 0 ? null : order[worst]!
}

/** The panel is shown in development, and in production only when the app allows it (for example admins). */
export function shouldShowPanel(opts: { dev: boolean, allow?: boolean }): boolean {
  return opts.dev || !!opts.allow
}

export function panelNotes(opts: { dev: boolean, backgroundLoad: boolean }): string[] {
  const notes: string[] = []
  if (opts.backgroundLoad) notes.push('Page loaded in a background tab: LCP and FCP are not reported. Reload with the tab in front.')
  if (opts.dev) notes.push('Development mode: many unminified modules, so these numbers are not representative. Measure on a production build.')
  return notes
}

export interface VitalsSnapshot {
  LCP: number | null, FCP: number | null, CLS: number | null, INP: number | null, TTFB: number | null
  requests: number, transferKb: number | null, longTasks: number, heapMb: number | null, backgroundLoad: boolean
}

export function buildReport(s: VitalsSnapshot, meta: { url: string, at?: Date, userAgent?: string, notes?: string[] }) {
  const names: VitalName[] = ['LCP', 'FCP', 'CLS', 'INP', 'TTFB']
  const vitals = Object.fromEntries(names.map((n) => {
    const v = s[n]
    return [n, { value: v === null ? null : Number(v.toFixed(n === 'CLS' ? 4 : 1)), rating: rateVital(n, v), display: formatVital(n, v) }]
  }))
  return {
    url: meta.url,
    at: (meta.at ?? new Date()).toISOString(),
    userAgent: meta.userAgent,
    notes: meta.notes ?? [],
    vitals,
    other: { requests: s.requests, transferKb: s.transferKb, longTasks: s.longTasks, heapMb: s.heapMb },
  }
}
