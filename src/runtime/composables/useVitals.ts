import { useState } from '#imports'
import type { VitalsSnapshot } from '../utils'

const empty = (): VitalsSnapshot => ({ LCP: null, FCP: null, CLS: null, INP: null, TTFB: null, requests: 0, transferKb: null, longTasks: 0, heapMb: null, backgroundLoad: false })

/** Live Core Web Vitals of the current page. Call `start()` once; it is idempotent and client-only. */
export function useVitals() {
  const vitals = useState<VitalsSnapshot>('vitals-panel:metrics', empty)
  const started = useState<boolean>('vitals-panel:started', () => false)

  function readResources() {
    const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    vitals.value.requests = res.length
    vitals.value.transferKb = Math.round(res.reduce((n, r) => n + (r.transferSize || 0), 0) / 1024)
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
    vitals.value.heapMb = mem ? Math.round(mem.usedJSHeapSize / 1048576) : null
  }

  async function start() {
    if (!import.meta.client || started.value) return
    started.value = true
    const first = performance.getEntriesByType('visibility-state')[0]
    vitals.value.backgroundLoad = first ? first.name === 'hidden' : document.visibilityState === 'hidden'

    // web-vitals measures LCP, CLS and INP the way Google does (and ignores pages loaded in the background).
    const { onLCP, onFCP, onCLS, onINP, onTTFB } = await import('web-vitals')
    const opts = { reportAllChanges: true }
    onLCP(m => { vitals.value.LCP = m.value }, opts)
    onFCP(m => { vitals.value.FCP = m.value }, opts)
    onCLS(m => { vitals.value.CLS = m.value }, opts)
    onINP(m => { vitals.value.INP = m.value }, opts)
    onTTFB(m => { vitals.value.TTFB = m.value }, opts)

    try {
      new PerformanceObserver((list) => { vitals.value.longTasks += list.getEntries().length }).observe({ type: 'longtask', buffered: true })
    } catch { /* longtask not supported */ }

    readResources()
    window.addEventListener('load', () => setTimeout(readResources, 0), { once: true })
    window.setInterval(() => { if (document.visibilityState === 'visible') readResources() }, 5000)
  }

  return { vitals, start }
}
