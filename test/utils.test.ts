import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rateVital, formatVital, shouldShowPanel, overallRating, panelNotes, buildReport } from '../src/runtime/utils.ts'

test('rateVital follows the web.dev thresholds', () => {
  assert.equal(rateVital('LCP', 2500), 'good')
  assert.equal(rateVital('LCP', 3000), 'needs-improvement')
  assert.equal(rateVital('LCP', 4001), 'poor')
  assert.equal(rateVital('CLS', 0.05), 'good')
  assert.equal(rateVital('INP', 600), 'poor')
  assert.equal(rateVital('TTFB', null), null)
})

test('formatVital', () => {
  assert.equal(formatVital('LCP', 1234), '1.23 s')
  assert.equal(formatVital('FCP', 420.4), '420 ms')
  assert.equal(formatVital('CLS', 0.0123), '0.012')
  assert.equal(formatVital('INP', null), '—')
})

test('shouldShowPanel: always in dev, in production only when allowed', () => {
  assert.equal(shouldShowPanel({ dev: true }), true)
  assert.equal(shouldShowPanel({ dev: false }), false)
  assert.equal(shouldShowPanel({ dev: false, allow: true }), true)
})

test('panelNotes flags background loads and development mode', () => {
  assert.equal(panelNotes({ dev: false, backgroundLoad: false }).length, 0)
  assert.equal(panelNotes({ dev: true, backgroundLoad: true }).length, 2)
  assert.match(panelNotes({ dev: false, backgroundLoad: true })[0]!, /background/)
})

test('buildReport returns serialisable values, ratings and extras', () => {
  const r = buildReport(
    { LCP: 3000.44, FCP: null, CLS: 0.01234, INP: 100, TTFB: 900, requests: 30, transferKb: 12, longTasks: 2, heapMb: null, backgroundLoad: false },
    { url: 'http://x/', at: new Date('2026-11-07T10:00:00Z') },
  )
  assert.equal(r.at, '2026-11-07T10:00:00.000Z')
  assert.deepEqual(r.vitals.LCP, { value: 3000.4, rating: 'needs-improvement', display: '3.00 s' })
  assert.equal(r.vitals.FCP.value, null)
  assert.equal(r.vitals.CLS.value, 0.0123)
  assert.deepEqual(r.other, { requests: 30, transferKb: 12, longTasks: 2, heapMb: null })
  assert.doesNotThrow(() => JSON.stringify(r))
})

test('overallRating = worst measured rating', () => {
  assert.equal(overallRating({}), null)
  assert.equal(overallRating({ LCP: 1000, CLS: 0.01 }), 'good')
  assert.equal(overallRating({ LCP: 1000, INP: 300 }), 'needs-improvement')
  assert.equal(overallRating({ LCP: 5000, INP: 100, FCP: null }), 'poor')
})
