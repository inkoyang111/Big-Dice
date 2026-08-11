const fs = require('node:fs/promises')
const path = require('node:path')
const sharp = require('sharp')

const root = path.resolve(__dirname, '..')
const outputDir = path.join(root, 'assets', 'images')

const transparentAssets = [
  ['设计稿/分层素材/骰盅.png', 'cup-closed.png', 480],
  ['设计稿/分层素材/骰盘.png', 'tray.png', 650],
  ['设计稿/分层补充素材-v2/open-cup-alpha.png', 'cup-open.png', 440],
  ['设计稿/分层补充素材-v2/floor-medallion-alpha.png', 'medallion.png', 760],
  ['设计稿/分层补充素材-v2/button-base-alpha.png', 'button.png', 680],
  ...Array.from({ length: 6 }, (_, index) => [
    `设计稿/骰子组件-v2/dice-${index + 1}-trim.png`,
    `dice-${index + 1}.png`,
    120
  ])
]

async function prepareAssets() {
  await fs.mkdir(outputDir, { recursive: true })

  const backgroundPath = path.join(root, '设计稿/分层素材/背景.png')

  await sharp(backgroundPath)
    .resize({ width: 780 })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(outputDir, 'background.jpg'))

  await sharp(path.join(root, '设计稿/分层素材/背景-开盖.png'))
    .resize({ width: 780 })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(outputDir, 'background-open.jpg'))

  for (const [input, output, width] of transparentAssets) {
    await sharp(path.join(root, input))
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize({ width })
      .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
      .toFile(path.join(outputDir, output))
  }
}

prepareAssets().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
