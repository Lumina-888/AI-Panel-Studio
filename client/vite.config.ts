import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'  // not needed for Vite 8 but keeping for clarity
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
