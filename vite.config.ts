import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
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

// shown in the menu, so the person can tell which version their phone runs
const VERSION = JSON.parse(readFileSync('package.json', 'utf8')).version as string
const BUILD = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return ''
  }
})()

// base './' lets the same build run at a domain root or under a sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(VERSION), __APP_BUILD__: JSON.stringify(BUILD) },
  plugins: [
    react(),
    pdfCmaps(),
    VitePWA({
      // the app picks the moment to switch to a new version (src/ui/update.ts)
      registerType: 'prompt',
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
