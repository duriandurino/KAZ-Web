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
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
          });
        },
        timeout: 30000, // 30 second timeout
      },
      // Add direct proxies for non-prefixed paths
      '/users': {
        target: 'https://eminent-chalk-lotus.glitch.me',
        changeOrigin: true,
      },
      '/room': {
        target: 'https://eminent-chalk-lotus.glitch.me',
        changeOrigin: true,
      },
      '/payments': {
        target: 'https://eminent-chalk-lotus.glitch.me',
        changeOrigin: true,
      },
      '/bookings': {
        target: 'https://eminent-chalk-lotus.glitch.me',
        changeOrigin: true,
      },
    },
  },
})
