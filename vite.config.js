import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const BACKEND_URL = "http://localhost:5000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      // 🟢 ADDED: Proxy for Socket.io real-time traffic
      "/socket.io": {
        target: BACKEND_URL,
        ws: true, // Enables WebSockets
        changeOrigin: true
      }
    },
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 4173,
    allowedHosts: ['bluxurywebsite.onrender.com', '*.onrender.com'],
  },
});