import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['../src/module'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  compatibilityDate: '2025-07-15',
})
