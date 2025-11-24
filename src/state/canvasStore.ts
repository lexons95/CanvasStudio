import { create } from 'zustand'
import { DEFAULT_RATIO_ID, findRatioValue } from '../lib/canvas/ratios'
import { DEFAULT_BASE_WIDTH, MAX_SCALE, clamp, computeCoverScale, computeContainScale, convertBorderToBasePx } from '../lib/canvas/math'
import { loadImageFromFile } from '../lib/image/loadImage'
import type {
  BorderSetting,
  CanvasSnapshot,
  ExportOptions,
  RatioOptionId,
  TransformState,
} from '../types/canvas'
import type { ImageMetadata } from '../types/image'

type BorderKey = 'top' | 'bottom'

export interface CanvasStoreState {
  image?: ImageMetadata
  ratioId: RatioOptionId
  customRatio: { width: number; height: number }
  transform: TransformState
  borders: Record<BorderKey, BorderSetting>
  centerSnap: boolean
  autoFit: boolean
  background: string
  previewSize: { width: number; height: number } | null
  exportOptions: ExportOptions
  loadImage: (file: File) => Promise<void>
  setRatio: (id: RatioOptionId) => void
  setCustomRatio: (payload: { width: number; height: number }) => void
  updateTransform: (transform: Partial<TransformState>) => void
  nudgePosition: (delta: { x: number; y: number }) => void
  adjustScale: (factor: number) => void
  setScale: (value: number) => void
  setCenterSnap: (value: boolean) => void
  resetTransform: () => void
  setBorders: (payload: Partial<Record<BorderKey, BorderSetting>>) => void
  setAutoFit: (value: boolean) => void
  setBackground: (value: string) => void
  setPreviewSize: (size: { width: number; height: number }) => void
  setExportOptions: (options: Partial<ExportOptions>) => void
  snapshot: () => CanvasSnapshot
}

const initialBorder: BorderSetting = { value: 0, unit: 'px' }

// Centralized state for every canvas + export concern so UI remains declarative.
export const useCanvasStore = create<CanvasStoreState>((set, get) => ({
  ratioId: DEFAULT_RATIO_ID,
  customRatio: { width: 4, height: 5 },
  transform: { x: 0, y: 0, scale: 1 },
  borders: {
    top: { ...initialBorder },
    bottom: { ...initialBorder },
  },
  centerSnap: true,
  autoFit: false,
  background: '#ffffff',
  previewSize: null,
  exportOptions: { format: 'png', quality: 1, mode: 'original' },
  async loadImage(file: File) {
    const image = await loadImageFromFile(file)
    // Reset transform - ImageLayer will initialize scale when canvas dimensions are available
    set({ 
      image,
      transform: { x: 0, y: 0, scale: 1 }
    })
  },
  setRatio(id) {
    set({ ratioId: id })
    ensureValidState({ fit: true })
  },
  setCustomRatio(payload) {
    set({ customRatio: payload, ratioId: 'custom' })
    ensureValidState({ fit: true })
  },
  updateTransform(transform) {
    set((state) => {
      const merged = {
        ...state.transform,
        ...transform,
      }
      const snapped = state.centerSnap
        ? {
            ...merged,
            x: Math.abs(merged.x) < 2 ? 0 : merged.x,
            y: Math.abs(merged.y) < 2 ? 0 : merged.y,
          }
        : merged
      return { transform: snapped }
    })
  },
  nudgePosition(delta) {
    set((state) => {
      const moved = {
        ...state.transform,
        x: state.transform.x + delta.x,
        y: state.transform.y + delta.y,
      }
      const snapped = state.centerSnap
        ? {
            ...moved,
            x: Math.abs(moved.x) < 2 ? 0 : moved.x,
            y: Math.abs(moved.y) < 2 ? 0 : moved.y,
          }
        : moved
      return { transform: snapped }
    })
  },
  adjustScale(factor) {
    set((state) => {
      const minScale = getMinScale(state)
      const nextScale = clamp(state.transform.scale * factor, minScale, MAX_SCALE)
      return { transform: { ...state.transform, scale: nextScale } }
    })
  },
  setScale(value) {
    set((state) => {
      const minScale = getMinScale(state)
      return { transform: { ...state.transform, scale: clamp(value, minScale, MAX_SCALE) } }
    })
  },
  setCenterSnap(value) {
    set({ centerSnap: value })
  },
  resetTransform() {
    set((state) => {
      const minScale = getMinScale(state)
      return {
        transform: {
          x: 0,
          y: 0,
          scale: Math.max(1, minScale),
        },
      }
    })
  },
  setBorders(payload) {
    set((state) => ({
      borders: {
        ...state.borders,
        ...payload,
      },
    }))
    ensureValidState({ fit: get().autoFit })
  },
  setAutoFit(value) {
    set({ autoFit: value })
    ensureValidState({ fit: value })
  },
  setBackground(value) {
    set({ background: value })
  },
  setPreviewSize(size) {
    set({ previewSize: size })
  },
  setExportOptions(options) {
    set((state) => ({
      exportOptions: {
        ...state.exportOptions,
        ...options,
        quality:
          options.quality !== undefined
            ? clamp(options.quality, 0.5, 1)
            : state.exportOptions.quality,
      },
    }))
  },
  snapshot() {
    const state = get()
    return {
      image: state.image,
      transform: state.transform,
      borders: state.borders,
      background: state.background,
      dimensions: deriveDimensions(state),
      ratioId: state.ratioId,
      previewSize: state.previewSize,
    }
  },
}))

function getRatioValue(state: CanvasStoreState): number {
  return findRatioValue(state.ratioId, { custom: state.customRatio, image: state.image })
}

function deriveDimensions(state: CanvasStoreState) {
  const baseWidth = state.image?.width ?? DEFAULT_BASE_WIDTH
  const ratio = getRatioValue(state)
  const baseHeight = baseWidth / ratio
  return { baseWidth, baseHeight, ratio }
}

function getMinScale(state: CanvasStoreState): number {
  if (!state.image) return 1
  const { baseWidth, baseHeight } = deriveDimensions(state)
  const topPx = convertBorderToBasePx(state.borders.top, baseHeight)
  const bottomPx = convertBorderToBasePx(state.borders.bottom, baseHeight)
  return computeCoverScale(state.image, baseWidth, baseHeight, topPx, bottomPx)
}

// Guarantees that scale & alignment respect the current ratio/border constraints.
function ensureValidState({ fit, useContain = false }: { fit: boolean; useContain?: boolean }) {
  const state = useCanvasStore.getState()
  const image = state.image
  if (!image) {
    return
  }

  const { baseWidth, baseHeight } = deriveDimensions(state)
  
  let initialScale: number
  if (useContain) {
    // Use contain logic: scale image to fit inside canvas
    initialScale = computeContainScale(image, baseWidth, baseHeight)
  } else {
    // Use cover logic: scale image to cover canvas (with borders)
    const topPx = convertBorderToBasePx(state.borders.top, baseHeight)
    const bottomPx = convertBorderToBasePx(state.borders.bottom, baseHeight)
    initialScale = computeCoverScale(image, baseWidth, baseHeight, topPx, bottomPx)
  }

  useCanvasStore.setState((current) => {
    const nextScale = useContain 
      ? initialScale 
      : Math.max(initialScale, current.transform.scale)
    const nextTransform = {
      ...current.transform,
      scale: nextScale,
    }
    if (fit) {
      nextTransform.x = 0
      nextTransform.y = 0
    }
    return { transform: nextTransform }
  })
}

export const selectDimensions = deriveDimensions

export const selectRatioValue = getRatioValue

export const selectMinimumScale = getMinScale

