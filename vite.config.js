import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// MapLibre starts its web worker from maplibre-gl-worker.mjs next to the
// bundle, and the worker imports maplibre-gl-shared.mjs: copy both there.
const maplibreWorker = () => ({
  name: 'maplibre-worker',
  generateBundle() {
    for (const fileName of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
      this.emitFile({
        type: 'asset',
        fileName,
        source: readFileSync(
          fileURLToPath(new URL(`./node_modules/maplibre-gl/dist/${fileName}`, import.meta.url))
        ),
      })
    }
  },
})

export default defineConfig({
  plugins: [react(), maplibreWorker()],
  // Assets are found next to the bundle, wherever it is served from
  base: './',
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        // Apart from the page's chunks of the same libraries
        chunkFileNames: 'worker-[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  build: {
    outDir: 'iris/static/dist',
    // MapLibre alone is about 1 MB
    chunkSizeWarningLimit: 1600,
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
