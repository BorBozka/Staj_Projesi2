import type { RescheduleVisitInput, Visit, VisitInput, VisitReferenceData } from "@/domain/visits"
import { initialMockVisits, mockVisitReferenceData } from "@/services/mock-visit-data"
import type { VisitService } from "@/services/visit-service"

const clone = <T,>(value: T): T => structuredClone(value)

export class MockVisitService implements VisitService {
  private visits = clone(initialMockVisits)

  async listVisits(): Promise<Visit[]> {
    return clone(this.visits).sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
  }

  async getReferenceData(): Promise<VisitReferenceData> {
    return clone(mockVisitReferenceData)
  }

  async createVisit(input: VisitInput): Promise<Visit> {
    const visit = this.fromInput(`v-${crypto.randomUUID()}`, input)
    this.visits = [...this.visits, visit]
    return clone(visit)
  }

  async updateVisit(id: string, input: VisitInput): Promise<Visit> {
    const current = this.findVisit(id)
    const updated = this.fromInput(id, input, current)
    this.visits = this.visits.map((visit) => (visit.id === id ? updated : visit))
    return clone(updated)
  }

  async rescheduleVisit(id: string, input: RescheduleVisitInput): Promise<Visit> {
    const current = this.findVisit(id)
    const updated: Visit = {
      ...current,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      updatedAt: new Date().toISOString(),
    }
    this.visits = this.visits.map((visit) => (visit.id === id ? updated : visit))
    return clone(updated)
  }

  async cancelVisit(id: string): Promise<Visit> {
    const current = this.findVisit(id)
    if (current.status !== "PLANNED") {
      throw new Error("Yalnızca planlanmış ziyaretler iptal edilebilir.")
    }
    const now = new Date().toISOString()
    const updated: Visit = { ...current, status: "CANCELLED", cancelledAt: now, updatedAt: now }
    this.visits = this.visits.map((visit) => (visit.id === id ? updated : visit))
    return clone(updated)
  }

  private findVisit(id: string) {
    const visit = this.visits.find((item) => item.id === id)
    if (!visit) throw new Error("Ziyaret bulunamadı.")
    return visit
  }

  private fromInput(id: string, input: VisitInput, existing?: Visit): Visit {
    const reference = mockVisitReferenceData
    const visitType = reference.visitTypes.find((item) => item.id === input.visitTypeId)
    const employee = reference.employees.find((item) => item.id === input.hostEmployeeId)
    const company = reference.companies.find((item) => item.id === input.hostCompanyId)
    const facility = reference.facilities.find((item) => item.id === input.facilityId)
    if (!visitType || !employee || !company || !facility) throw new Error("Geçersiz ziyaret referans bilgisi.")

    const now = new Date().toISOString()
    return {
      id,
      visitor: {
        id: existing?.visitor.id ?? `visitor-${crypto.randomUUID()}`,
        firstName: input.visitorFirstName.trim(),
        lastName: input.visitorLastName.trim(),
        email: input.visitorEmail.trim(),
      },
      visitTypeId: visitType.id,
      visitTypeName: visitType.name,
      hostEmployeeId: employee.id,
      hostEmployeeName: employee.name,
      hostCompanyId: company.id,
      hostCompanyName: company.name,
      facilityId: facility.id,
      facilityName: facility.name,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      status: existing?.status ?? "PLANNED",
      note: input.note?.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      cancelledAt: existing?.cancelledAt,
    }
  }
}
