import type { RescheduleVisitInput, Visit, VisitInput, VisitReferenceData } from "@/domain/visits"

export interface VisitService {
  listVisits(): Promise<Visit[]>
  getReferenceData(): Promise<VisitReferenceData>
  createVisit(input: VisitInput): Promise<Visit>
  updateVisit(id: string, input: VisitInput): Promise<Visit>
  sendVisitInvitation(id: string): Promise<Visit>
  rescheduleVisit(id: string, input: RescheduleVisitInput): Promise<Visit>
  cancelVisit(id: string): Promise<Visit>
}
