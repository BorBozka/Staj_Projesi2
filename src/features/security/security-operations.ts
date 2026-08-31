import { differenceInMinutes, isBefore, isSameDay } from "date-fns"

import type { Visit } from "@/domain/visits"

export interface SecurityVisitRow {
  visit: Visit
  isDelayed: boolean
  delayMinutes: number
}

export function getSecurityScopedVisits(visits: Visit[], companyId: string, facilityId: string) {
  return visits.filter((visit) => visit.hostCompanyId === companyId && visit.facilityId === facilityId)
}

export function getExpectedSecurityVisits(visits: Visit[], now: Date): SecurityVisitRow[] {
  return visits
    .filter((visit) => visit.status === "PLANNED" && isSameDay(new Date(visit.plannedStart), now))
    .map((visit) => {
      const isDelayed = isBefore(new Date(visit.plannedStart), now)
      return { visit, isDelayed, delayMinutes: isDelayed ? differenceInMinutes(now, new Date(visit.plannedStart)) : 0 }
    })
    .sort((left, right) => {
      if (left.isDelayed !== right.isDelayed) return left.isDelayed ? -1 : 1
      return new Date(left.visit.plannedStart).getTime() - new Date(right.visit.plannedStart).getTime()
        || left.visit.id.localeCompare(right.visit.id)
    })
}

export function getInsideSecurityVisits(visits: Visit[], now: Date): SecurityVisitRow[] {
  return visits
    .filter((visit) => visit.status === "CHECKED_IN")
    .map((visit) => {
      const isDelayed = isBefore(new Date(visit.plannedEnd), now)
      return { visit, isDelayed, delayMinutes: isDelayed ? differenceInMinutes(now, new Date(visit.plannedEnd)) : 0 }
    })
    .sort((left, right) => {
      if (left.isDelayed !== right.isDelayed) return left.isDelayed ? -1 : 1
      if (left.isDelayed && right.isDelayed) return right.delayMinutes - left.delayMinutes
      return new Date(left.visit.plannedEnd).getTime() - new Date(right.visit.plannedEnd).getTime()
        || new Date(left.visit.actualCheckIn ?? left.visit.plannedStart).getTime() - new Date(right.visit.actualCheckIn ?? right.visit.plannedStart).getTime()
        || left.visit.id.localeCompare(right.visit.id)
    })
}

/**
 * Human-readable elapsed time in Turkish. Below an hour it stays in minutes
 * ("18 dk"); from an hour up it switches to "S sa D dk" ("1 sa 25 dk") and
 * drops the minute part on a whole hour ("2 sa"). Negative input clamps to 0.
 */
export function formatDuration(totalMinutes: number) {
  const minutes = Math.max(0, Math.trunc(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} dk`
  if (rest === 0) return `${hours} sa`
  return `${hours} sa ${rest} dk`
}

/**
 * Delay / overrun copy for a status pill, e.g. "1 sa 25 dk gecikti" or
 * "20 dk süre aştı". Falls back to the bare state word when the elapsed time
 * truncates to zero. Shared by the expected and inside panels so the two never
 * grow separate duration-formatting logic.
 */
export function formatDelayLabel(state: "gecikti" | "süre aştı", minutes: number) {
  if (Math.trunc(minutes) <= 0) return state === "gecikti" ? "Gecikti" : "Süre aştı"
  return `${formatDuration(minutes)} ${state}`
}

export function filterSecurityVisitRows(rows: SecurityVisitRow[], search: string) {
  const query = normalizeTurkishSearch(search)
  if (!query) return rows

  return rows.filter(({ visit }) => normalizeTurkishSearch([
    visit.visitor.firstName,
    visit.visitor.lastName,
    visit.visitor.company,
    visit.hostEmployeeName,
  ].join(" ")).includes(query))
}

function normalizeTurkishSearch(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR")
}
