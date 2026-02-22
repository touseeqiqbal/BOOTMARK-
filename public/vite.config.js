import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Allow external connections
    allowedHosts: [
      'localhost',
      '.ngrok-free.dev',
      '.ngrok.io',
      '.ngrok.app',
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - split large dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react'],
          'vendor-forms': ['react-dnd', 'react-dnd-html5-backend'],
          'vendor-calendar': ['react-big-calendar', 'date-fns'],
          'vendor-charts': ['recharts']
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000
  },
  // For Vercel deployment
  base: '/'
})
