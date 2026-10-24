import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

// pdf.js needs its character maps to read the words of Japanese PDFs (src/assistant/file.ts); they are served
// from pdfjs/cmaps/ and fetched only when a PDF is read
const CMAPS = 'node_modules/pdfjs-dist/cmaps'
const pdfCmaps = (): Plugin => ({
  name: 'pdf-cmaps',
  configureServer(server) {
    server.middlewares.use('/pdfjs/cmaps/', (req, res, next) => {
      const name = (req.url ?? '').replace(/^\//, '').split('?')[0]
      if (!/^[\w.-]+\.bcmap$/.test(name)) return next()
      res.setHeader('content-type', 'application/octet-stream')
      res.end(readFileSync(join(CMAPS, name)))
    })
  },
  generateBundle() {
    for (const name of readdirSync(CMAPS).filter((n) => n.endsWith('.bcmap'))) {
      this.emitFile({ type: 'asset', fileName: `pdfjs/cmaps/${name}`, source: readFileSync(join(CMAPS, name)) })
    }
  },
})

// base './' lets the same build run at a domain root or under a sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    pdfCmaps(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Lifey',
        short_name: 'Lifey',
        id: './',
        description: 'Money for you and the people you live with.',
        lang: 'en',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#050606',
        theme_color: '#0A0C0B',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // the PDF reader is large and only needed online, with the assistant
        globIgnores: ['**/pdf-*.js', '**/pdf.worker*'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
