import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
} as const

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { ...apiProxy },
  },
  // `vite preview` no hereda `server.proxy`; sin esto POST /api/* devuelve 405 del preview
  preview: {
    proxy: { ...apiProxy },
  },
})
