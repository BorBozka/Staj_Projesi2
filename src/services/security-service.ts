import type { VisitorCardInventoryItem } from "@/domain/admin"
import type { Visit } from "@/domain/visits"

export interface SecurityCheckInInput {
  visitId: string
  visitorCardId: string
  vehiclePlate?: string
}

export interface SecurityVisitorCorrectionInput {
  firstName: string
  lastName: string
  email?: string
  company: string
  phone?: string
}

export interface SecurityService {
  /** Cards Security can currently hand out — status === AVAILABLE only. */
  getAvailableVisitorCards(): Promise<VisitorCardInventoryItem[]>

  /**
   * Checks a planned visitor into the facility (PLANNED → CHECKED_IN). Rejects any visit not
   * currently PLANNED and any card not currently AVAILABLE. On success the visit records the
   * check-in time and a snapshot of the assigned card, and the card moves to IN_USE linked to
   * this visit. Does not touch Meeting fields or invitation state.
   */
  checkInVisit(input: SecurityCheckInInput): Promise<Visit>

  /**
   * Corrects visitor identity/contact fields (name, company, email, phone) at the gate. Allowed
   * for PLANNED and CHECKED_IN visits only; rejected for terminal visits. Never touches
   * host/type/facility/schedule fields or invitation metadata.
   */
  correctVisitor(visitId: string, input: SecurityVisitorCorrectionInput): Promise<Visit>
}
