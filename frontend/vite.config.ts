import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/admin': {
        target: 'http://localhost:8000',
        bypass(req) {
          // Admin page routes and API routes share the /admin prefix.
          if ((req.method === 'GET' || req.method === 'HEAD') && req.headers.accept?.includes('text/html')) {
            return '/index.html'
          }
        },
      },
    },
  },
})
