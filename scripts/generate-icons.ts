import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const PUBLIC = path.resolve(__dirname, '..', 'public')
const SVG_PATH = path.join(PUBLIC, 'icon.svg')

const ICON_SIZES = [
  { name: 'icon-16.png', size: 16 },
  { name: 'icon-32.png', size: 32 },
  { name: 'icon-180.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
]

async function generateIcons() {
  const svgBuffer = fs.readFileSync(SVG_PATH)

  for (const { name, size } of ICON_SIZES) {
    const outPath = path.join(PUBLIC, name)
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath)
    console.log(`Generated ${name} (${size}x${size})`)
  }

  await generateOgImage(svgBuffer)
}

async function generateOgImage(svgBuffer: Buffer) {
  const W = 1200
  const H = 630
  const ICON_SIZE = 280
  const BG = '#2C1810'

  const iconPng = await sharp(svgBuffer).resize(ICON_SIZE, ICON_SIZE).png().toBuffer()

  const iconLeft = 120
  const iconTop = Math.round((H - ICON_SIZE) / 2)

  const textLeft = iconLeft + ICON_SIZE + 80
  const wordmarkY = Math.round(H / 2 - 60)
  const taglineY = wordmarkY + 100

  const svgOverlay = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@700');
      </style>
      <text x="${textLeft}" y="${wordmarkY}" font-family="Fredoka, Georgia, serif" font-size="120" font-weight="700" fill="#FAC775">Cravia</text>
      <text x="${textLeft}" y="${taglineY}" font-family="Fredoka, Georgia, sans-serif" font-size="36" fill="#F0997B">Discover what's worth craving</text>
    </svg>
  `

  await sharp({
    create: { width: W, height: H, channels: 4, background: BG },
  })
    .composite([
      { input: iconPng, left: iconLeft, top: iconTop },
      { input: Buffer.from(svgOverlay), left: 0, top: 0 },
    ])
    .png()
    .toFile(path.join(PUBLIC, 'og-image.png'))

  console.log(`Generated og-image.png (${W}x${H})`)
}

generateIcons().catch((err) => {
  console.error('Icon generation failed:', err)
  process.exit(1)
})
