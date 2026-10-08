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

export default defineConfig(({ command }) => ({
  plugins: [react(), maplibreWorker()],
  // The server serves the build under /static/dist/
  base: command === 'build' ? '/static/dist/' : '/',
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
        // The segmentation and the admin pages
        index: 'index.html',
        admin: 'admin.html'
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
}))
