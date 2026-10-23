// Renders public/icon.svg to the PNG sizes the web manifest and iOS need.
// Usage: npm run icons (needs Playwright's Chromium; set CHROMIUM_PATH if it isn't on the default path)
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage()
const out = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['apple-touch-icon.png', 180, 0],
  ['icon-512-maskable.png', 512, 0.12],
]
for (const [name, size, pad] of out) {
  await page.setViewportSize({ width: size, height: size })
  const inner = Math.round(size * (1 - pad * 2))
  await page.setContent(
    `<body style="margin:0;background:#0A0C0B;display:grid;place-items:center;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body>`,
  )
  await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname, omitBackground: false })
}
await browser.close()
