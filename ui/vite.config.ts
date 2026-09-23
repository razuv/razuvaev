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
      '/__remote-media': {target:'https://pfapi.razuvaev.tv',changeOrigin:true,rewrite:path=>path.replace('/__remote-media','/api/media')},
      '/__settings': {
        target: process.env.VITE_DEV_API_URL || 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: () => '/api/settings',
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
