import type { VisitorCardInventoryItem } from "@/domain/admin"
import type { Visit } from "@/domain/visits"

export interface SecurityCheckInInput {
  visitId: string
  visitorCardId: string
  vehiclePlate?: string
}

export interface SecurityCheckOutInput {
  visitId: string
  cardReturned: boolean
}

export interface SecurityCardIssue {
  card: VisitorCardInventoryItem
  visit: Visit
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

  /** Completes a checked-in visit and records whether its assigned physical card was returned. */
  checkOutVisit(input: SecurityCheckOutInput): Promise<Visit>

  /** Current NOT_RETURNED cards that still have a linked checked-out visit. */
  getUnreturnedVisitorCardIssues(): Promise<SecurityCardIssue[]>

  /** Records a later physical card return without reopening or changing the visit checkout time. */
  receiveReturnedVisitorCard(visitId: string): Promise<Visit>

  /**
   * Corrects visitor identity/contact fields (name, company, email, phone) at the gate. Allowed
   * for PLANNED and CHECKED_IN visits only; rejected for terminal visits. Never touches
   * host/type/facility/schedule fields or invitation metadata.
   */
  correctVisitor(visitId: string, input: SecurityVisitorCorrectionInput): Promise<Visit>
}
