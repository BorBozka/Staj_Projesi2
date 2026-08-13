import type { Visit } from "@/domain/visits"

export type VisitViewerRole = "EMPLOYEE" | "MANAGER" | "SECURITY"

export function getOwnVisits(visits: Visit[], currentEmployeeId?: string) {
  if (!currentEmployeeId) return []
  return visits.filter((visit) => visit.creatorEmployeeId === currentEmployeeId)
}

export function getVisibleAdditionalRequirementNote(visit: Visit, viewerRole: VisitViewerRole) {
  if (viewerRole === "SECURITY" || !visit.hasAdditionalRequirements) return undefined
  return visit.additionalRequirementNote
}
