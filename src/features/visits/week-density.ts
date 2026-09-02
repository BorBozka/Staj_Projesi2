export interface WeekDensity {
  /** Vertical distance between two stacked visit blocks, in px. */
  pitch: number
  /** Minimum row height, sized so the day label stays legible at that pitch. */
  labelFloor: number
}

/** Roomy density used when the week grid is free to scroll. */
export const defaultWeekDensity: WeekDensity = { pitch: 27, labelFloor: 56 }

/**
 * Progressively tighter week-row densities. The first entry keeps the default
 * block size; later entries trade block height for rows that still fit.
 */
export const weekDensitySteps: WeekDensity[] = [
  { pitch: 27, labelFloor: 44 },
  { pitch: 25, labelFloor: 40 },
  { pitch: 23, labelFloor: 38 },
  { pitch: 21, labelFloor: 36 },
  { pitch: 19, labelFloor: 34 },
]

/** Height a single week row needs at the given density. */
export function weekRowHeight(density: WeekDensity, visitCount: number) {
  return Math.max(density.labelFloor, visitCount * density.pitch + 4)
}

/**
 * Loosest density that keeps every day of the week inside `available` px.
 * Falls back to the tightest step when even that overflows, so the grid degrades
 * to scrolling instead of clipping.
 */
export function resolveWeekDensity(visitCounts: number[], available: number): WeekDensity {
  if (available <= 0) return weekDensitySteps[0]
  const required = (density: WeekDensity) =>
    visitCounts.reduce((total, count) => total + weekRowHeight(density, count), 0)
  return weekDensitySteps.find((density) => required(density) <= available) ?? weekDensitySteps[weekDensitySteps.length - 1]
}
