import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
