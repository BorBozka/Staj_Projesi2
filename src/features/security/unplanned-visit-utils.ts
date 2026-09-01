export const DEFAULT_UNPLANNED_DURATION_MINUTES = 60
export const unplannedDurationOptions = [30, 60, 120, 240] as const

export function getUnplannedDurationError(value: string): string | null {
  const minutes = Number(value)
  if (!Number.isInteger(minutes) || minutes <= 0) return "Tahmini süre pozitif tam dakika olmalıdır."
  return null
}
