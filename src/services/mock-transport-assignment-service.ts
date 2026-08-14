import type { DriverResource, FacilityResource, VehicleResource } from "@/domain/resources"
import type {
  CreatePlannedTransportAssignmentInput,
  PlannedTransportAssignment,
  TransportAvailability,
  TransportAvailabilityInput,
} from "@/domain/transport-assignments"
import { initialMockTransportAssignments } from "@/services/mock-transport-assignment-data"
import type { ResourceCatalogService } from "@/services/resource-catalog-service"
import type { TransportAssignmentService } from "@/services/transport-assignment-service"
import type { VisitService } from "@/services/visit-service"

const clone = <T,>(value: T): T => structuredClone(value)

export class MockTransportAssignmentService implements TransportAssignmentService {
  private assignments = clone(initialMockTransportAssignments)

  constructor(
    private readonly visitService: VisitService,
    private readonly catalogService: ResourceCatalogService,
  ) {}

  async listAssignments(): Promise<PlannedTransportAssignment[]> {
    return clone(this.assignments).sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
  }

  async getAvailability(input: TransportAvailabilityInput): Promise<TransportAvailability> {
    await this.assertScopeAndTime(input)
    const resources = await this.catalogService.listResources()

    return {
      vehicles: resources.filter((resource): resource is VehicleResource =>
        resource.type === "VEHICLE" && this.isEligibleAndAvailable(resource, input),
      ),
      drivers: resources.filter((resource): resource is DriverResource =>
        resource.type === "DRIVER" && this.isEligibleAndAvailable(resource, input),
      ),
    }
  }

  async createAssignment(input: CreatePlannedTransportAssignmentInput): Promise<PlannedTransportAssignment> {
    const assignment = await this.validateAndCreateAssignment(input)
    this.assignments = [...this.assignments, assignment]
    return clone(assignment)
  }

  async updateAssignment(id: string, input: CreatePlannedTransportAssignmentInput): Promise<PlannedTransportAssignment> {
    const current = this.findAssignment(id)
    if (current.status === "CANCELLED") throw new Error("İptal edilen atama düzenlenemez.")
    const assignment = await this.validateAndCreateAssignment(input, id, current)
    this.assignments = this.assignments.map((item) => item.id === id ? assignment : item)
    return clone(assignment)
  }

  async cancelAssignment(id: string): Promise<PlannedTransportAssignment> {
    const current = this.findAssignment(id)
    if (current.status === "CANCELLED") throw new Error("Atama zaten iptal edildi.")
    const cancelled = { ...current, status: "CANCELLED" as const }
    this.assignments = this.assignments.map((item) => item.id === id ? cancelled : item)
    return clone(cancelled)
  }

  private async validateAndCreateAssignment(
    input: CreatePlannedTransportAssignmentInput,
    excludeAssignmentId?: string,
    current?: PlannedTransportAssignment,
  ): Promise<PlannedTransportAssignment> {
    await this.assertScopeAndTime(input)
    if (!input.purpose.trim()) throw new Error("Görev/amaç zorunludur.")
    if (input.relatedMeetingId && input.relatedVisitId) {
      throw new Error("Atama yalnızca bir Meeting veya bir Visit ile ilişkilendirilebilir.")
    }

    const resources = await this.catalogService.listResources()
    const vehicle = this.getScopedResource(resources, input.vehicleResourceId, "VEHICLE", input)
    const driver = this.getScopedResource(resources, input.driverResourceId, "DRIVER", input)
    await this.assertRelatedRecordScope(input)

    const availability = await this.getAvailability({ ...input, excludeAssignmentId })
    if (!availability.vehicles.some((resource) => resource.id === vehicle.id)) {
      throw new Error("Seçilen araç bu zaman aralığında müsait değil.")
    }
    if (!availability.drivers.some((resource) => resource.id === driver.id)) {
      throw new Error("Seçilen şoför bu zaman aralığında müsait değil.")
    }

    const assignment: PlannedTransportAssignment = {
      id: current?.id ?? `transport-assignment-${crypto.randomUUID()}`,
      companyId: vehicle.companyId,
      companyName: vehicle.companyName,
      facilityId: vehicle.facilityId,
      facilityName: vehicle.facilityName,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      purpose: input.purpose.trim(),
      vehicleResourceId: vehicle.id,
      vehicleName: `${vehicle.brand} ${vehicle.model}`.trim(),
      vehicleLicensePlate: vehicle.licensePlate,
      driverResourceId: driver.id,
      driverName: driver.fullName,
      ...(input.relatedMeetingId ? { relatedMeetingId: input.relatedMeetingId } : {}),
      ...(input.relatedVisitId ? { relatedVisitId: input.relatedVisitId } : {}),
      status: "ACTIVE",
      createdAt: current?.createdAt ?? new Date().toISOString(),
    }
    return assignment
  }

  private async assertScopeAndTime(input: TransportAvailabilityInput) {
    const start = new Date(input.plannedStart)
    const end = new Date(input.plannedEnd)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw new Error("Başlangıç zamanı bitiş zamanından önce olmalıdır.")
    }

    const referenceData = await this.visitService.getReferenceData()
    const company = referenceData.companies.find((item) => item.id === input.companyId)
    const facility = referenceData.facilities.find(
      (item) => item.id === input.facilityId && item.companyId === input.companyId,
    )
    if (!company || !facility) throw new Error("Şirket ve tesis eşleşmesi geçersiz.")
  }

  private findAssignment(id: string) {
    const assignment = this.assignments.find((item) => item.id === id)
    if (!assignment) throw new Error("Planlı atama bulunamadı.")
    return assignment
  }

  private getScopedResource<T extends "VEHICLE" | "DRIVER">(
    resources: FacilityResource[],
    resourceId: string,
    type: T,
    input: TransportAvailabilityInput,
  ): Extract<FacilityResource, { type: T }> {
    const resource = resources.find((item) => item.id === resourceId && item.type === type)
    if (!resource) throw new Error(type === "VEHICLE" ? "Araç kaynağı bulunamadı." : "Şoför kaynağı bulunamadı.")
    if (!resource.isActive) throw new Error(type === "VEHICLE" ? "Seçilen araç aktif değil." : "Seçilen şoför aktif değil.")
    if (resource.companyId !== input.companyId || resource.facilityId !== input.facilityId) {
      throw new Error(type === "VEHICLE" ? "Araç seçilen şirket ve tesise ait değil." : "Şoför seçilen şirket ve tesise ait değil.")
    }
    return resource as Extract<FacilityResource, { type: T }>
  }

  private isEligibleAndAvailable(resource: VehicleResource | DriverResource, input: TransportAvailabilityInput) {
    return resource.isActive
      && resource.companyId === input.companyId
      && resource.facilityId === input.facilityId
      && !this.assignments.some((assignment) =>
        assignment.status === "ACTIVE"
        && assignment.id !== input.excludeAssignmentId
        && (assignment.vehicleResourceId === resource.id || assignment.driverResourceId === resource.id)
        && rangesOverlap(assignment.plannedStart, assignment.plannedEnd, input.plannedStart, input.plannedEnd),
      )
  }

  private async assertRelatedRecordScope(input: CreatePlannedTransportAssignmentInput) {
    if (!input.relatedMeetingId && !input.relatedVisitId) return

    if (input.relatedMeetingId) {
      const meeting = (await this.visitService.listMeetings()).find((item) => item.id === input.relatedMeetingId)
      if (!meeting) throw new Error("İlişkili Meeting bulunamadı.")
      if (meeting.hostCompanyId !== input.companyId || meeting.facilityId !== input.facilityId) {
        throw new Error("İlişkili Meeting seçilen şirket ve tesise ait değil.")
      }
      return
    }

    const visit = (await this.visitService.listVisits()).find((item) => item.id === input.relatedVisitId)
    if (!visit) throw new Error("İlişkili Visit bulunamadı.")
    if (visit.hostCompanyId !== input.companyId || visit.facilityId !== input.facilityId) {
      throw new Error("İlişkili Visit seçilen şirket ve tesise ait değil.")
    }
  }
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return new Date(startA).getTime() < new Date(endB).getTime()
    && new Date(endA).getTime() > new Date(startB).getTime()
}
