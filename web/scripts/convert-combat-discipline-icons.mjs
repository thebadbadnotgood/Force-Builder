/**
 * Converts source TIFFs from repo `combat diciplines/` into PNGs under
 * `public/combat-disciplines/` for web use (browser-friendly names).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.join(__dirname, '..')
const repoRoot = path.join(webRoot, '..')
const sourceDir = path.join(repoRoot, 'combat diciplines')
const outDir = path.join(webRoot, 'public', 'combat-disciplines')

const map = [
  ['tactical.tif', 'tactical.png'],
  ['Barbaric.tif', 'barbaric.png'],
  ['reinforced.tif', 'reinforced.png'],
  ['honor bound.tif', 'honor_bound.png'],
  ['standard.tif', 'standard_bearers.png'],
  ['predatory.tif', 'predatory.png'],
  ['judicial.tif', 'judicial.png'],
  ['air support.tif', 'air_support.png'],
  ['cultist.tif', 'cultist.png'],
  ['gambler.tif', 'gamblers.png'],
  ['beast tamers.tif', 'beast_tamers.png'],
  ['Technicians1.tif', 'technicians.png'],
]

fs.mkdirSync(outDir, { recursive: true })

for (const [srcName, destName] of map) {
  const src = path.join(sourceDir, srcName)
  const dest = path.join(outDir, destName)
  if (!fs.existsSync(src)) {
    console.warn(`skip (missing): ${srcName}`)
    continue
  }
  await sharp(src).png({ compressionLevel: 9 }).toFile(dest)
  console.log(`${srcName} -> ${destName}`)
}

console.log('done:', outDir)
