import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'iris/static/dist',
    rollupOptions: {
      input: {
        // Admin and segmentation app entry points
        adminApp: 'src/admin-app.tsx',
        segmentationApp: 'src/segmentation-app.tsx'
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  server: {
    port: 3000
  }
})