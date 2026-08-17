import type { Visit } from "@/domain/visits"
import { getIsoWallClockMinutes } from "@/lib/date"

const defaultTimelineStartHour = 8
const defaultTimelineEndHour = 18

export interface TimelineRange {
  startMinutes: number
  endMinutes: number
}

export function getTimelineRange(visits: Visit[]): TimelineRange {
  if (visits.length === 0) {
    return { startMinutes: defaultTimelineStartHour * 60, endMinutes: defaultTimelineEndHour * 60 }
  }

  const visitStartMinutes = (visit: Visit) => getIsoWallClockMinutes(visit.plannedStart) ?? 0
  const visitEndMinutes = (visit: Visit) => getIsoWallClockMinutes(visit.plannedEnd) ?? 0

  const earliestStart = Math.min(...visits.map(visitStartMinutes))
  const latestEnd = Math.max(...visits.map(visitEndMinutes))
  const startHour = Math.max(0, Math.min(defaultTimelineStartHour, Math.floor(earliestStart / 60) - 1))
  const endHour = Math.min(24, Math.max(defaultTimelineEndHour, Math.ceil(latestEnd / 60) + 1))

  return { startMinutes: startHour * 60, endMinutes: endHour * 60 }
}
