/**
 * Build square transparent favicons from repo-root cs-logo.png (letterboxed, not stretched).
 * Removes near-white background pixels, then trims and fits into a square.
 * Run: npm run make-favicon
 */
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.join(__dirname, '..')
const logoPath = path.join(webRoot, '..', 'cs-logo.png')
const publicDir = path.join(webRoot, 'public')

/** Turn light/white backdrop transparent so the tab icon isn’t a white box. */
async function logoTransparentSharp() {
  const { data, info } = await sharp(logoPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const buf = Buffer.from(data)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    const r = buf[o]
    const g = buf[o + 1]
    const b = buf[o + 2]
    if (r >= 248 && g >= 248 && b >= 248) {
      buf[o + 3] = 0
    }
  }

  return sharp(buf, {
    raw: { width, height, channels: 4 },
  })
}

async function writeFavicon(base, size, filename) {
  await base
    .clone()
    .trim({ threshold: 5 })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(publicDir, filename))
}

async function main() {
  const base = await logoTransparentSharp()
  await writeFavicon(base, 32, 'favicon-32.png')
  await writeFavicon(base, 48, 'favicon.png')
  await writeFavicon(base, 64, 'favicon-64.png')
  console.log('Wrote public/favicon.png (48px), favicon-32.png, favicon-64.png')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
