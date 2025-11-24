import type { CanvasSnapshot, ExportOptions } from '../../types/canvas'
import { renderScene } from '../canvas/render'

interface ExportResponse {
  blob: Blob
  fileName: string
}

export async function exportComposite(
  snapshot: CanvasSnapshot,
  options: ExportOptions
): Promise<ExportResponse> {
  if (!snapshot.image) {
    throw new Error('Import an image before exporting.')
  }

  const ratio = snapshot.dimensions.ratio
  const previewWidth = snapshot.previewSize?.width ?? snapshot.dimensions.baseWidth
  const previewHeight = snapshot.previewSize?.height ?? snapshot.dimensions.baseHeight

  // Calculate target dimensions based on export mode
  let targetWidth: number
  let targetHeight: number

  if (options.mode === 'original') {
    // Scale to original image resolution while maintaining aspect ratio
    targetWidth = snapshot.image.width
    targetHeight = Math.round(targetWidth / ratio)
  } else {
    // Use canvas size (preview size)
    targetWidth = Math.round(previewWidth)
    targetHeight = Math.round(previewHeight)
  }

  // Calculate scale factor from preview to target
  const widthScale = targetWidth / previewWidth
  const heightScale = targetHeight / previewHeight

  const canvas = document.createElement('canvas')
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.max(1, Math.round(targetWidth * dpr))
  canvas.height = Math.max(1, Math.round(targetHeight * dpr))
  const ctx = canvas.getContext('2d', { colorSpace: 'srgb' })
  if (!ctx) {
    throw new Error('Unable to prepare export context.')
  }
  ctx.scale(dpr, dpr)

  // Render only the canvas + image (workspace is never exported)
  renderScene({
    ctx,
    width: targetWidth,
    height: targetHeight,
    background: snapshot.background,
    transform: {
      x: snapshot.transform.x * widthScale,
      y: snapshot.transform.y * heightScale,
      scale: snapshot.transform.scale,
    },
    borders: {
      top: 0, // Borders are not used in the new architecture
      bottom: 0,
    },
    image: snapshot.image,
  })

  const mime = options.format === 'png' ? 'image/png' : 'image/jpeg'
  const quality = options.format === 'png' ? undefined : options.quality

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Unable to finalize export.'))
          return
        }
        resolve(result)
      },
      mime,
      quality
    )
  })

  return {
    blob,
    fileName: buildFileName(snapshot.image.fileName, options.format),
  }
}

const buildFileName = (base: string, format: ExportOptions['format']): string => {
  const clean = base.replace(/\.[^.]+$/, '')
  return `${clean || 'canvas'}-framed.${format === 'png' ? 'png' : 'jpg'}`
}

