const minimumExtensionMinutes = 5
export const maximumCustomExtensionMinutes = 480

export function isValidCustomExtensionMinutes(value: string): boolean {
  const minutes = Number(value)
  return Number.isInteger(minutes)
    && minutes >= minimumExtensionMinutes
    && minutes <= maximumCustomExtensionMinutes
    && minutes % minimumExtensionMinutes === 0
}

export function getCustomExtensionError(value: string): string | null {
  if (value.trim() === "") return null
  const minutes = Number(value)
  if (Number.isNaN(minutes)) return "Geçerli bir dakika değeri girin."
  if (!Number.isInteger(minutes)) return "Uzatma süresi tam sayı olmalıdır."
  if (minutes < minimumExtensionMinutes) return `Uzatma süresi en az ${minimumExtensionMinutes} dakika olmalıdır.`
  if (minutes > maximumCustomExtensionMinutes) return `Uzatma süresi en fazla ${maximumCustomExtensionMinutes} dakika olabilir.`
  if (minutes % minimumExtensionMinutes !== 0) return "Uzatma süresi 5 dakikanın katı olmalıdır."
  return null
}

/** The overdue-meeting panel always previews from its shared current-time snapshot. */
export function getExtensionPreviewEnd(now: Date, minutes: number): Date | null {
  if (!Number.isInteger(minutes) || minutes <= 0) return null
  return new Date(now.getTime() + minutes * 60_000)
}
