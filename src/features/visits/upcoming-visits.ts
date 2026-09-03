import { differenceInCalendarDays, differenceInMinutes, isAfter } from "date-fns"

import type { Visit } from "@/domain/visits"
import { formatMinutesDuration, formatTr } from "@/lib/date"

const RELATIVE_TIME_THRESHOLD_MINUTES = 120

export function formatUpcomingVisitTypeLine(visitTypeName: string, visitorCompany?: string): string {
  const company = visitorCompany?.trim()
  return company ? `${visitTypeName} · ${company}` : visitTypeName
}

export interface UpcomingVisitDayGroup {
  label: string
  visits: Visit[]
}

export function getNonCancelledUpcomingVisits(visits: Visit[]): Visit[] {
  return visits.filter((visit) => visit.status !== "CANCELLED")
}

export function getUpcomingVisits(visits: Visit[], now: Date): Visit[] {
  return visits
    .filter((visit) => visit.status === "PLANNED" && isAfter(new Date(visit.plannedStart), now))
    .sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
}

export function getUpcomingVisitRelativeTime(plannedStart: string, now: Date): string | null {
  const start = new Date(plannedStart)
  if (start <= now) return null
  const minutesUntilStart = differenceInMinutes(start, now)
  if (minutesUntilStart > RELATIVE_TIME_THRESHOLD_MINUTES) return null
  return `${formatMinutesDuration(minutesUntilStart)} sonra`
}

export function getUpcomingVisitDayGroups(visits: Visit[], now: Date): UpcomingVisitDayGroup[] {
  const groups = new Map<string, { date: Date; visits: Visit[] }>()

  visits.forEach((visit) => {
    const date = new Date(visit.plannedStart)
    const key = formatTr(date, "yyyy-MM-dd")
    const group = groups.get(key)
    if (group) {
      group.visits.push(visit)
      return
    }
    groups.set(key, { date, visits: [visit] })
  })

  return [...groups.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ date, visits: groupedVisits }) => {
      const dayDifference = differenceInCalendarDays(date, now)
      const label = dayDifference === 0
        ? "Bugün"
        : dayDifference === 1
          ? "Yarın"
          : formatTr(date, "d MMMM EEEE")
      return { label, visits: groupedVisits }
    })
}
