import type { BorderSetting } from '../../types/canvas'
import type { ImageMetadata } from '../../types/image'

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const DEFAULT_BASE_WIDTH = 1600

export const MAX_SCALE = 8

export function convertBorderToBasePx(border: BorderSetting, baseHeight: number): number {
  if (border.unit === 'px') {
    return clamp(border.value, 0, baseHeight * 0.9)
  }
  return clamp((border.value / 100) * baseHeight, 0, baseHeight * 0.9)
}

export function computeVisibleHeight(baseHeight: number, topPx: number, bottomPx: number): number {
  return Math.max(16, baseHeight - topPx - bottomPx)
}

export function computeCoverScale(
  image: ImageMetadata,
  baseWidth: number,
  baseHeight: number,
  topPx: number,
  bottomPx: number
): number {
  const visibleHeight = computeVisibleHeight(baseHeight, topPx, bottomPx)
  const scaleByWidth = baseWidth / image.width
  const scaleByHeight = visibleHeight / image.height
  return Math.max(scaleByWidth, scaleByHeight)
}

export function computeContainScale(
  image: ImageMetadata,
  canvasWidth: number,
  canvasHeight: number
): number {
  const scaleByWidth = canvasWidth / image.width
  const scaleByHeight = canvasHeight / image.height
  return Math.min(scaleByWidth, scaleByHeight)
}

