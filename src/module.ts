import { addComponent, addImports, createResolver, defineNuxtModule } from '@nuxt/kit'

export interface ModuleOptions {
  /** Where the flame button sits on the screen edge. */
  position: 'right' | 'left'
}

export default defineNuxtModule<ModuleOptions>({
  meta: { name: 'nuxt-vitals-panel', configKey: 'vitalsPanel', compatibility: { nuxt: '>=3.15.0' } },
  defaults: { position: 'right' },
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    nuxt.options.runtimeConfig.public.vitalsPanel = { position: options.position }
    addComponent({ name: 'VitalsPanel', filePath: resolve('./runtime/components/VitalsPanel.vue') })
    addImports({ name: 'useVitals', from: resolve('./runtime/composables/useVitals') })
  },
})
