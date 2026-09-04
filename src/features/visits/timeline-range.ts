import type { Visit } from "@/domain/visits"
import { getIstanbulWallClockMinutes } from "@/lib/date"

const defaultTimelineStartHour = 8
const defaultTimelineEndHour = 18

export interface TimelineRange {
  startMinutes: number
  endMinutes: number
}

export function getTimelineVisitStartMinutes(visit: Pick<Visit, "plannedStart">) {
  return getIstanbulWallClockMinutes(visit.plannedStart) ?? 0
}

export function getTimelineVisitEndMinutes(visit: Pick<Visit, "plannedStart" | "plannedEnd">) {
  const startMinutes = getTimelineVisitStartMinutes(visit)
  const endMinutes = getIstanbulWallClockMinutes(visit.plannedEnd) ?? 0
  return new Date(visit.plannedEnd) > new Date(visit.plannedStart) && endMinutes <= startMinutes
    ? endMinutes + 24 * 60
    : endMinutes
}

export function getTimelineOffset(minutes: number, timeRange: TimelineRange) {
  return ((minutes - timeRange.startMinutes) / (timeRange.endMinutes - timeRange.startMinutes)) * 100
}

export function getDayVisitPlacement(startMinutes: number, endMinutes: number, timeRange: TimelineRange) {
  const top = getTimelineOffset(startMinutes, timeRange)
  return { top, height: getTimelineOffset(endMinutes, timeRange) - top }
}

export function getDayVisitMinimumHeight(durationMinutes: number) {
  return durationMinutes <= 30 ? 32 : durationMinutes < 60 ? 42 : 54
}

// These values directly match DayVisitCard's leading-4 name line and three leading-[13px] detail lines.
const dayVisitNameLineHeight = 16
const dayVisitDetailLineHeight = 13

/** Number of complete lines that fit in DayVisitCard's measured content area. */
export function getDayVisitContentLineCount(contentHeight: number) {
  if (contentHeight >= dayVisitNameLineHeight + dayVisitDetailLineHeight * 3) return 4
  if (contentHeight >= dayVisitNameLineHeight + dayVisitDetailLineHeight * 2) return 3
  if (contentHeight >= dayVisitNameLineHeight + dayVisitDetailLineHeight) return 2
  return 1
}

export function getTimelineRange(visits: Visit[]): TimelineRange {
  if (visits.length === 0) {
    return { startMinutes: defaultTimelineStartHour * 60, endMinutes: defaultTimelineEndHour * 60 }
  }

  const earliestStart = Math.min(...visits.map(getTimelineVisitStartMinutes))
  const latestEnd = Math.max(...visits.map(getTimelineVisitEndMinutes))
  const startHour = Math.max(0, Math.min(defaultTimelineStartHour, Math.floor(earliestStart / 60) - 1))
  const endHour = Math.min(24, Math.max(defaultTimelineEndHour, Math.ceil(latestEnd / 60) + 1))

  return { startMinutes: startHour * 60, endMinutes: endHour * 60 }
}
