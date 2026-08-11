import type { Visit } from "@/domain/visits"

export function getPendingInvitationVisits(visits: Visit[]) {
  return visits.filter((visit) =>
    visit.status === "PLANNED" &&
    (visit.invitationStatus === "NOT_SENT" || visit.invitationStatus === "SENDING" || visit.invitationStatus === "FAILED"),
  )
}

export function getInvitationActionLabel(visit: Visit, isSending = false) {
  if (isSending || visit.invitationStatus === "SENDING") return "Gönderiliyor…"
  if (visit.invitationStatus === "FAILED") return "Tekrar Dene"
  if (visit.invitationStatus === "SENT") return "Davet gönderildi"
  return "Daveti Gönder"
}
