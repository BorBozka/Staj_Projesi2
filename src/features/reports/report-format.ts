export function formatDurationMinutes(minutes: number | null): string {
  if (minutes === null) return "—"
  if (minutes < 60) return `${minutes} dk`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours} sa` : `${hours} sa ${remainder} dk`
}
