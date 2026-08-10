import { isAfter } from "date-fns"

import type { Visit } from "@/domain/visits"

export function getUpcomingVisits(visits: Visit[], now: Date): Visit[] {
  return visits
    .filter((visit) => visit.status === "PLANNED" && isAfter(new Date(visit.plannedStart), now))
    .sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
}
