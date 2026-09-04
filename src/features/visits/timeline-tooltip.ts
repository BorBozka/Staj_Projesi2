export interface TimelineTooltipPosition {
  top: number
  left: number
  maxWidth: number
  maxHeight: number
}

interface Rectangle {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

interface Viewport {
  width: number
  height: number
}

const viewportPadding = 8
const tooltipGap = 4

export function getTimelineTooltipPosition(anchor: Rectangle, tooltip: Rectangle, viewport: Viewport): TimelineTooltipPosition {
  const maxWidth = Math.max(0, viewport.width - viewportPadding * 2)
  const maxHeight = Math.max(0, viewport.height - viewportPadding * 2)
  const left = Math.min(Math.max(viewportPadding, anchor.left), Math.max(viewportPadding, viewport.width - viewportPadding - tooltip.width))
  const below = anchor.bottom + tooltipGap
  const top = below + tooltip.height <= viewport.height - viewportPadding
    ? below
    : Math.max(viewportPadding, anchor.top - tooltipGap - tooltip.height)

  return { top, left, maxWidth, maxHeight }
}
