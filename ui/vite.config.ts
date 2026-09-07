import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { localMediaPlugin } from '../scripts/vite-local-media.mjs'

const uiDirectory = fileURLToPath(new URL('.', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), localMediaPlugin(uiDirectory)],
  server: {
    // Allow the local settings middleware to read the repository API data in dev.
    fs: {
      allow: [fileURLToPath(new URL('..', import.meta.url))],
    },
    proxy: {
      '/__settings': {
        target: 'https://razuvaev-admin-ng.website.yandexcloud.net',
        changeOrigin: true,
        rewrite: () => '/settings.json',
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import', 'global-builtin'],
      },
    },
  },
})
