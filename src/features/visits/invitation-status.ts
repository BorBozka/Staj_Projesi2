import type { Visit } from "@/domain/visits"

export function getPendingInvitationVisits(visits: Visit[]) {
  return visits.filter((visit) =>
    visit.status === "PLANNED" &&
    (visit.invitationStatus === "NOT_SENT" || visit.invitationStatus === "SENDING" || visit.invitationStatus === "FAILED"),
  )
}

export function getVisiblePendingInvitationVisits(visits: Visit[], dismissedVisitIds: ReadonlySet<string>) {
  return getPendingInvitationVisits(visits).filter((visit) => !dismissedVisitIds.has(visit.id))
}

export function getActionRequiredInvitationVisits(visits: Visit[], currentEmployeeId?: string) {
  if (!currentEmployeeId) return []

  return visits.filter((visit) =>
    visit.creatorEmployeeId === currentEmployeeId &&
    visit.status === "PLANNED" &&
    (visit.invitationStatus === "NOT_SENT" || visit.invitationStatus === "FAILED"),
  )
}

export function getInvitationActionLabel(visit: Visit, isSending = false) {
  if (isSending || visit.invitationStatus === "SENDING") return "Gönderiliyor…"
  if (visit.invitationStatus === "FAILED") return "Yeniden gönder"
  if (visit.invitationStatus === "SENT") return "Davet gönderildi"
  return "Daveti gönder"
}
