import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Standard localhost setup
    host: 'localhost',
    port: 5173,
    strictPort: false, // Allow fallback to next available port
    proxy: {
      '/api': {
        target: 'https://eminent-chalk-lotus.glitch.me', // Your backend server
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
