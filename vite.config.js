import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// MapLibre starts its web worker from maplibre-gl-worker.mjs next to its own
// module, in assets/, and the worker imports maplibre-gl-shared.mjs: copy both there.
const maplibreWorker = () => ({
  name: 'maplibre-worker',
  generateBundle() {
    for (const fileName of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
      this.emitFile({
        type: 'asset',
        fileName: `assets/${fileName}`,
        source: readFileSync(
          fileURLToPath(new URL(`./node_modules/maplibre-gl/dist/${fileName}`, import.meta.url))
        ),
      })
    }
  },
})

export default defineConfig({
  plugins: [react(), maplibreWorker()],
  // Relative addresses, so the page works from any folder, e.g. on GitHub Pages
  base: './',
  worker: {
    format: 'es'
  },
  build: {
    outDir: 'dist',
    // MapLibre alone is about 1 MB
    chunkSizeWarningLimit: 1600
  },
  // MapLibre loads its worker from next to its own module: serve it as it is
  optimizeDeps: {
    exclude: ['maplibre-gl']
  },
  server: {
    port: 3000
  }
})
