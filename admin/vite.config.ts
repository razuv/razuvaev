import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import { localMediaPlugin } from '../scripts/vite-local-media.mjs'

const adminDirectory = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  clearScreen: false,
  server: {
    port: 5174,
    fs: { allow: ['..'] },
    proxy: {
      '/__settings': {
        target: 'https://razuvaev-admin-ng.website.yandexcloud.net',
        changeOrigin: true,
        rewrite: () => '/settings.json',
      },
    },
  },
  plugins: [vue(), localMediaPlugin(adminDirectory)],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
