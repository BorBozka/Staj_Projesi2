import type { Visit } from "@/domain/visits"

/**
 * Turkish-aware lowercase. Plain `toLowerCase()` maps "I" to "i" instead of "ı",
 * so searching "ISTANBUL" would miss "İstanbul" and vice versa.
 */
function fold(value: string) {
  return value.toLocaleLowerCase("tr-TR")
}

/** Fields a visit can be found by. Kept narrow on purpose: notes are excluded so
 * a free-text note cannot flood results with weak matches. */
function searchableText(visit: Visit) {
  return [
    visit.visitor.firstName,
    visit.visitor.lastName,
    `${visit.visitor.firstName} ${visit.visitor.lastName}`,
    visit.visitor.company,
    visit.visitTypeName,
    visit.facilityName,
    visit.hostCompanyName,
    visit.hostEmployeeName,
  ]
}

export function matchesVisitQuery(visit: Visit, query: string): boolean {
  const needle = fold(query.trim())
  if (!needle) return false
  return searchableText(visit).some((field) => fold(field).includes(needle))
}

/**
 * Searches every visit the viewer owns — past ones included — and orders hits by
 * how close they sit to `now`, so the visit someone is looking for surfaces first
 * whether it is just ahead or just behind.
 */
export function searchVisits(visits: Visit[], query: string, now: Date): Visit[] {
  if (!query.trim()) return []
  const reference = now.getTime()
  return visits
    .filter((visit) => matchesVisitQuery(visit, query))
    .sort((a, b) => {
      const distance =
        Math.abs(new Date(a.plannedStart).getTime() - reference) - Math.abs(new Date(b.plannedStart).getTime() - reference)
      return distance !== 0 ? distance : a.plannedStart.localeCompare(b.plannedStart)
    })
}
