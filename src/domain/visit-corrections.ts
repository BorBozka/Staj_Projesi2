import type { ApplicationRole } from "@/domain/admin"

// Deliberately excludes actual check-in/out, visitor-card history, and closed Meeting fields.
// A future backend/audit phase can consume this contract without opening the normal visit form.
export interface AdminVisitCorrectionInput {
  visitId: string
  reason: string
  changes: {
    visitorCompany?: string
    phone?: string
    plate?: string
    note?: string
  }
}

export function canCorrectVisit(role: ApplicationRole) {
  return role === "ADMIN"
}
