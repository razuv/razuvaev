import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import { localMediaPlugin } from '../scripts/vite-local-media.mjs'

const adminDirectory = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => ({
  clearScreen: false,
  server: {
    port: 5174,
    fs: { allow: ['..'] },
    proxy: {
      '/api': {
        target: loadEnv(mode, adminDirectory, '').VITE_DEV_API_URL || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/__settings': {
        target: loadEnv(mode, adminDirectory, '').VITE_DEV_API_URL || 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: () => '/api/settings',
      },
    },
  },
  plugins: [vue(), localMediaPlugin(adminDirectory)],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
}))
