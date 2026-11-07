<script setup lang="ts">
// A flame button on the screen edge that opens a live Core Web Vitals panel.
// Shown in development; in production only when `allow` is true (pass an admin flag).
import { computed, onMounted, ref, useRuntimeConfig, watch } from '#imports'
import { useVitals } from '../composables/useVitals'
import { buildReport, formatVital, panelNotes, rateVital, shouldShowPanel } from '../utils'

const props = withDefaults(defineProps<{ allow?: boolean, position?: 'right' | 'left' }>(), { allow: false, position: undefined })
const config = useRuntimeConfig().public.vitalsPanel as { position?: 'right' | 'left' } | undefined
const side = computed(() => props.position ?? config?.position ?? 'right')

const { vitals, start } = useVitals()
const mounted = ref(false)
const open = ref(false)
const copied = ref<'idle' | 'ok' | 'error'>('idle')
const showNotes = ref(false)
const visible = computed(() => mounted.value && shouldShowPanel({ dev: import.meta.dev, allow: props.allow }))
const notes = computed(() => panelNotes({ dev: import.meta.dev, backgroundLoad: vitals.value.backgroundLoad }))

const KEY = 'vitals-panel:open'
function read() { try { return localStorage.getItem(KEY) } catch { return null } }
function write(v: string) { try { localStorage.setItem(KEY, v) } catch { /* storage unavailable */ } }

onMounted(() => { mounted.value = true; open.value = read() === '1' })
// Measurements only start once the panel is allowed and visible
watch(visible, (v) => { if (v) start() }, { immediate: true })

function toggle() { open.value = !open.value; write(open.value ? '1' : '0') }
function close() { open.value = false; write('0') }
async function copy() {
  const report = buildReport(vitals.value, { url: location.href, userAgent: navigator.userAgent, notes: notes.value })
  try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); copied.value = 'ok' } catch { copied.value = 'error' }
  window.setTimeout(() => { copied.value = 'idle' }, 2000)
}

const rows = [
  { key: 'LCP', hint: 'Largest content' },
  { key: 'FCP', hint: 'First paint' },
  { key: 'CLS', hint: 'Layout shifts' },
  { key: 'INP', hint: 'Responsiveness' },
  { key: 'TTFB', hint: 'Server response' },
] as const
const dot: Record<string, string> = { 'good': 'bg-emerald-400', 'needs-improvement': 'bg-amber-400', 'poor': 'bg-red-500' }
const copyLabel = computed(() => copied.value === 'ok' ? 'Copied' : copied.value === 'error' ? 'Copy failed' : 'Copy report')
</script>

<template>
  <div v-if="visible" class="fixed top-1/2 z-[9999] flex -translate-y-1/2 items-center" :class="side === 'right' ? 'right-0 flex-row' : 'left-0 flex-row-reverse'">
    <section v-if="open" id="vitals-panel" class="w-72 rounded-2xl bg-gray-900/95 p-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur" :class="side === 'right' ? 'mr-2' : 'ml-2'" aria-label="Web vitals">
      <header class="flex items-center justify-between gap-2">
        <h2 class="flex items-center gap-2 whitespace-nowrap text-sm font-semibold">
          <svg class="size-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
          Web vitals
        </h2>
        <span class="flex items-center gap-1">
          <button v-if="notes.length" type="button" class="cursor-pointer rounded p-1 text-amber-300 hover:text-amber-200" :aria-expanded="showNotes" aria-controls="vitals-panel-notes" :aria-label="showNotes ? 'Hide warnings' : 'Show warnings'" :title="showNotes ? 'Hide warnings' : 'Show warnings'" @click="showNotes = !showNotes">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
          </button>
          <button type="button" class="rounded p-1 text-white/60 hover:text-white" :aria-label="copyLabel" :title="copyLabel" @click="copy">
            <svg v-if="copied !== 'ok'" class="size-4" :class="copied === 'error' ? 'text-red-400' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
            <svg v-else class="size-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          </button>
          <span class="sr-only" aria-live="polite">{{ copied === 'idle' ? '' : copyLabel }}</span>
          <button type="button" class="rounded p-1 text-white/60 hover:text-white" aria-label="Close panel" @click="close">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </span>
      </header>
      <ul class="mt-3 space-y-1.5 text-xs">
        <li v-for="r in rows" :key="r.key" class="flex items-center justify-between gap-3" :title="r.hint">
          <span class="flex items-center gap-2 whitespace-nowrap"><span class="size-2 rounded-full" :class="dot[rateVital(r.key, vitals[r.key]) || ''] || 'bg-white/20'" aria-hidden="true" />{{ r.key }}</span>
          <span class="whitespace-nowrap font-mono tabular-nums">{{ formatVital(r.key, vitals[r.key]) }}</span>
        </li>
      </ul>
      <dl class="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs text-white/70">
        <div class="flex justify-between gap-3"><dt class="whitespace-nowrap">Requests</dt><dd class="whitespace-nowrap font-mono">{{ vitals.requests }} · {{ vitals.transferKb ?? '—' }} KB</dd></div>
        <div class="flex justify-between gap-3"><dt class="whitespace-nowrap">Long tasks</dt><dd class="whitespace-nowrap font-mono">{{ vitals.longTasks }}</dd></div>
        <div v-if="vitals.heapMb !== null" class="flex justify-between gap-3"><dt class="whitespace-nowrap">JS memory</dt><dd class="whitespace-nowrap font-mono">{{ vitals.heapMb }} MB</dd></div>
      </dl>
      <ul v-if="notes.length && showNotes" id="vitals-panel-notes" class="mt-3 space-y-1.5 rounded-lg bg-amber-400/10 p-2 text-[11px] leading-snug text-amber-200" role="note">
        <li v-for="n in notes" :key="n">{{ n }}</li>
      </ul>
    </section>
    <button type="button" class="flex size-10 cursor-pointer items-center justify-center bg-gray-900 text-orange-400 shadow-2xl ring-1 ring-white/10 hover:text-orange-300" :class="side === 'right' ? 'rounded-l-full' : 'rounded-r-full'" :aria-expanded="open" aria-controls="vitals-panel" :aria-label="open ? 'Close web vitals' : 'Open web vitals'" @click="toggle">
      <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
    </button>
  </div>
</template>
