import { useMemo, useState, useEffect, type ReactNode } from 'react'

interface CanvasProps {
  aspectRatio: number // width / height
  children: ReactNode
}

const MIN_CANVAS_WIDTH = 240
const MAX_CANVAS_WIDTH = 1400

/**
 * Canvas component - white rectangle representing the export area.
 * Keeps the selected aspect ratio, responsive to screen but maintains aspect ratio.
 * Positioned at the center of the workspace.
 */
export const Canvas = ({ aspectRatio, children }: CanvasProps) => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const canvasSize = useMemo(() => {
    // Use viewport dimensions for responsive sizing (leave some margin)
    const availableWidth = windowSize.width > 0 ? windowSize.width * 0.8 : MIN_CANVAS_WIDTH
    const availableHeight = windowSize.height > 0 ? windowSize.height * 0.8 : MIN_CANVAS_WIDTH / aspectRatio

    // Calculate width that fits within available space while maintaining aspect ratio
    let width = Math.min(availableWidth, MAX_CANVAS_WIDTH)
    let height = width / aspectRatio

    // If height exceeds available space, scale down
    if (height > availableHeight) {
      height = availableHeight
      width = height * aspectRatio
    }

    // Ensure minimum size
    if (width < MIN_CANVAS_WIDTH) {
      width = MIN_CANVAS_WIDTH
      height = width / aspectRatio
    }

    return { width, height }
  }, [windowSize.width, windowSize.height, aspectRatio])

  return (
    <div
      className="relative bg-white shadow-2xl"
      style={{
        width: canvasSize.width,
        height: canvasSize.height,
      }}
    >
      {children}
    </div>
  )
}

