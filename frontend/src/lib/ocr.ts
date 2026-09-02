import { createWorker, PSM } from 'tesseract.js'

export async function readImageText(file: File) {
  const prepared = await prepare(file)
  const worker = await createWorker('eng', 1, { logger: () => undefined })
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    })
    const full = await worker.recognize(prepared)
    const width = prepared.width
    const height = prepared.height
    const values = await worker.recognize(prepared, {
      rectangle: {
        left: Math.round(width * 0.34),
        top: Math.round(height * 0.1),
        width: Math.max(40, Math.round(width * 0.48)),
        height: Math.max(40, Math.round(height * 0.88)),
      },
    })
    const banner = await worker.recognize(prepared, {
      rectangle: {
        left: 0,
        top: 0,
        width,
        height: Math.max(40, Math.round(height * 0.2)),
      },
    })
    return [full.data.text, values.data.text, banner.data.text].join('\n')
  } finally {
    await worker.terminate()
  }
}

async function prepare(file: File) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.max(3, 1600 / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  const rowBytes = width * 4
  for (let y = 0; y < height; y += 1) {
    let blue = 0
    const row = y * rowBytes
    for (let x = 0; x < width; x += 1) {
      const i = row + x * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (b > 80 && b > r + 18 && b > g) blue += 1
    }
    const invert = blue / width > 0.28
    for (let x = 0; x < width; x += 1) {
      const i = row + x * 4
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      let value = invert ? 255 - gray : gray
      value = Math.max(0, Math.min(255, (value - 128) * 1.55 + 128))
      const tone = value > 210 ? 255 : value < 70 ? 0 : value
      data[i] = data[i + 1] = data[i + 2] = tone
    }
  }
  ctx.putImageData(image, 0, 0)
  bitmap.close()
  return canvas
}
