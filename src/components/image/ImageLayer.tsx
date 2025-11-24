import { useEffect, useRef } from 'react'
import { useGesture } from '@use-gesture/react'
import { useCanvasStore } from '../../state/canvasStore'
import { MAX_SCALE, clamp, computeContainScale } from '../../lib/canvas/math'
import type { ImageMetadata } from '../../types/image'

interface ImageLayerProps {
  image: ImageMetadata
  canvasWidth: number
  canvasHeight: number
}

/**
 * ImageLayer component - user-imported image that is movable and scalable.
 * Rendered inside the canvas, maintains aspect ratio, never exceeds max-scale caps.
 */
export const ImageLayer = ({ image, canvasWidth, canvasHeight }: ImageLayerProps) => {
  const transform = useCanvasStore((state) => state.transform)
  const nudgePosition = useCanvasStore((state) => state.nudgePosition)
  const adjustScale = useCanvasStore((state) => state.adjustScale)
  const updateTransform = useCanvasStore((state) => state.updateTransform)
  const imageRef = useRef<HTMLImageElement>(null)
  const lastImageId = useRef<string | null>(null)

  // Initialize scale to contain when image or canvas dimensions change
  useEffect(() => {
    const currentImageId = image.element.src
    const imageChanged = lastImageId.current !== currentImageId
    
    if (imageChanged) {
      lastImageId.current = currentImageId
    }

    if (canvasWidth > 0 && canvasHeight > 0 && image) {
      if (imageChanged) {
        // New image loaded - initialize scale to contain
        const containScale = computeContainScale(image, canvasWidth, canvasHeight)
        updateTransform({ scale: containScale, x: 0, y: 0 })
      }
    }
  }, [image, canvasWidth, canvasHeight, updateTransform])

  // Calculate image dimensions based on scale
  const imageDisplayWidth = image.width * transform.scale
  const imageDisplayHeight = image.height * transform.scale

  // Calculate bounds to keep image within canvas (allow some overflow for scaling)
  const maxX = Math.max(0, (imageDisplayWidth - canvasWidth) / 2)
  const maxY = Math.max(0, (imageDisplayHeight - canvasHeight) / 2)
  const minX = -maxX
  const minY = -maxY

  // Clamp position to keep image within reasonable bounds
  const clampedX = clamp(transform.x, minX, maxX)
  const clampedY = clamp(transform.y, minY, maxY)

  // Update position if it was clamped
  useEffect(() => {
    if (clampedX !== transform.x || clampedY !== transform.y) {
      updateTransform({ x: clampedX, y: clampedY })
    }
  }, [clampedX, clampedY, transform.x, transform.y, updateTransform])

  // Clamp scale to max
  useEffect(() => {
    if (transform.scale > MAX_SCALE) {
      updateTransform({ scale: MAX_SCALE })
    }
  }, [transform.scale, updateTransform])

  // Gesture bindings for drag, zoom, and pinch
  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy], shiftKey, event }) => {
        event?.preventDefault()
        if (shiftKey) {
          // Shift + drag for zoom
          const factor = Math.max(0.5, 1 - dy * 0.002)
          adjustScale(factor)
          return
        }
        // Regular drag for position
        nudgePosition({
          x: dx,
          y: dy,
        })
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault()
        const factor = Math.exp(-dy / 600)
        adjustScale(factor)
      },
      onPinch: ({ delta: [d], event }) => {
        event.preventDefault()
        const factor = Math.max(0.5, 1 + d / 200)
        adjustScale(factor)
      },
    },
    {
      eventOptions: { passive: false },
    }
  )

  return (
    <div
      {...bind()}
      className="absolute inset-0 overflow-hidden touch-none select-none"
      style={{
        cursor: 'move',
      }}
    >
      <img
        ref={imageRef}
        src={image.element.src}
        alt="Canvas image"
        className="absolute"
        style={{
          width: imageDisplayWidth,
          height: imageDisplayHeight,
          left: canvasWidth / 2 + clampedX - imageDisplayWidth / 2,
          top: canvasHeight / 2 + clampedY - imageDisplayHeight / 2,
          objectFit: 'contain',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
        draggable={false}
      />
    </div>
  )
}

