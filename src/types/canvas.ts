import type { ImageMetadata } from './image'

export type RatioOptionId =
  | '1:1'
  | '3:2'
  | '2:3'
  | '4:5'
  | '9:16'
  | 'original'
  | 'custom'

export interface RatioOption {
  id: RatioOptionId
  label: string
  value: number | null
  description?: string
}

export interface BorderSetting {
  value: number
  unit: 'px' | 'percent'
}

export interface TransformState {
  x: number
  y: number
  scale: number
}

export interface CanvasDimensions {
  baseWidth: number
  baseHeight: number
  ratio: number
}

export interface ExportOptions {
  format: 'png' | 'jpeg'
  quality: number // 0 - 1
  mode: 'original' | 'canvas'
}

export interface CanvasSnapshot {
  image?: ImageMetadata
  transform: TransformState
  borders: { top: BorderSetting; bottom: BorderSetting }
  background: string
  dimensions: CanvasDimensions
  ratioId: RatioOptionId
  previewSize: { width: number; height: number } | null
}

