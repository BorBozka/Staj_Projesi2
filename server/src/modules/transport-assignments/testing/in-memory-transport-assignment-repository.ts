import { ApiError } from "../../../lib/api-error.js"
import type {
  OverlappingActiveAssignment,
  PersistTransportAssignmentInput,
  TransportAssignmentRepository,
} from "../../../repositories/transport-assignment-repository.js"
import type { DriverResource, FacilityResource, VehicleResource } from "../../resources/types.js"
import type { PlannedTransportAssignmentDto } from "../types.js"

const clone = <T>(value: T): T => structuredClone(value)

export interface TransportAssignmentFixture {
  resources: FacilityResource[]
  facilityScopes: { companyId: string; facilityId: string; companyName?: string; facilityName?: string }[]
  meetingScopes?: Record<string, { companyId: string; facilityId: string }>
  visitScopes?: Record<string, { companyId: string; facilityId: string }>
  assignments?: PlannedTransportAssignmentDto[]
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart).getTime() < new Date(bEnd).getTime() && new Date(aEnd).getTime() > new Date(bStart).getTime()
}

export class InMemoryTransportAssignmentRepository implements TransportAssignmentRepository {
  private assignments: PlannedTransportAssignmentDto[]
  private readonly resources: FacilityResource[]
  private readonly facilityScopes: TransportAssignmentFixture["facilityScopes"]
  private readonly meetingScopes: Record<string, { companyId: string; facilityId: string }>
  private readonly visitScopes: Record<string, { companyId: string; facilityId: string }>
  private sequence = 0

  constructor(fixture: TransportAssignmentFixture) {
    this.assignments = clone(fixture.assignments ?? [])
    this.resources = clone(fixture.resources)
    this.facilityScopes = clone(fixture.facilityScopes)
    this.meetingScopes = clone(fixture.meetingScopes ?? {})
    this.visitScopes = clone(fixture.visitScopes ?? {})
  }

  async list() {
    return clone(this.assignments).sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
  }

  async find(id: string) {
    const assignment = this.assignments.find((item) => item.id === id)
    return assignment ? clone(assignment) : null
  }

  async companyAndFacilityMatch(companyId: string, facilityId: string) {
    return this.facilityScopes.some((scope) => scope.companyId === companyId && scope.facilityId === facilityId)
  }

  async findResource(resourceId: string) {
    const resource = this.resources.find((item) => item.id === resourceId)
    return resource ? clone(resource) : null
  }

  async findMeetingScope(meetingId: string) {
    return this.meetingScopes[meetingId] ? clone(this.meetingScopes[meetingId]) : null
  }

  async findVisitScope(visitId: string) {
    return this.visitScopes[visitId] ? clone(this.visitScopes[visitId]) : null
  }

  async listActiveResources(companyId: string, facilityId: string) {
    const scoped = this.resources.filter((resource) => resource.isActive && resource.companyId === companyId && resource.facilityId === facilityId)
    return {
      vehicles: scoped.filter((resource): resource is VehicleResource => resource.type === "VEHICLE"),
      drivers: scoped.filter((resource): resource is DriverResource => resource.type === "DRIVER"),
    }
  }

  async findOverlappingActive(input: { plannedStart: string; plannedEnd: string; excludeAssignmentId?: string }): Promise<OverlappingActiveAssignment[]> {
    return this.assignments
      .filter((assignment) =>
        assignment.status === "ACTIVE"
        && assignment.id !== input.excludeAssignmentId
        && overlaps(assignment.plannedStart, assignment.plannedEnd, input.plannedStart, input.plannedEnd))
      .map((assignment) => ({ id: assignment.id, vehicleResourceId: assignment.vehicleResourceId, driverResourceId: assignment.driverResourceId }))
  }

  async create(input: PersistTransportAssignmentInput) {
    this.assertNoOverlap(input, undefined)
    const record = this.toRecord(input, `transport-assignment-${++this.sequence}`, new Date("2026-01-01T00:00:00.000Z").toISOString())
    this.assignments = [...this.assignments, record]
    return clone(record)
  }

  async update(id: string, input: PersistTransportAssignmentInput) {
    const current = this.assignments.find((item) => item.id === id)
    if (!current) throw new ApiError(404, "NOT_FOUND", "Planlı atama bulunamadı.")
    if (current.status === "CANCELLED") throw new ApiError(409, "TRANSPORT_ASSIGNMENT_NOT_EDITABLE", "İptal edilen atama düzenlenemez.")
    this.assertNoOverlap(input, id)
    const record = this.toRecord(input, id, current.createdAt)
    this.assignments = this.assignments.map((item) => (item.id === id ? record : item))
    return clone(record)
  }

  async cancel(id: string) {
    const current = this.assignments.find((item) => item.id === id)
    if (!current || current.status !== "ACTIVE") return null
    const record: PlannedTransportAssignmentDto = { ...current, status: "CANCELLED" }
    this.assignments = this.assignments.map((item) => (item.id === id ? record : item))
    return clone(record)
  }

  private assertNoOverlap(input: PersistTransportAssignmentInput, excludeAssignmentId: string | undefined) {
    const clash = this.assignments.some((assignment) =>
      assignment.status === "ACTIVE"
      && assignment.id !== excludeAssignmentId
      && overlaps(assignment.plannedStart, assignment.plannedEnd, input.plannedStart, input.plannedEnd)
      && (assignment.vehicleResourceId === input.vehicleResourceId || assignment.driverResourceId === input.driverResourceId))
    if (clash) throw new ApiError(409, "TRANSPORT_ASSIGNMENT_CONFLICT", "Seçilen araç veya şoför bu zaman aralığında müsait değil.")
  }

  private toRecord(input: PersistTransportAssignmentInput, id: string, createdAt: string): PlannedTransportAssignmentDto {
    const scope = this.facilityScopes.find((item) => item.companyId === input.companyId && item.facilityId === input.facilityId)
    return {
      id,
      companyId: input.companyId,
      companyName: scope?.companyName ?? input.companyId,
      facilityId: input.facilityId,
      facilityName: scope?.facilityName ?? input.facilityId,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      purpose: input.purpose,
      vehicleResourceId: input.vehicleResourceId,
      vehicleName: input.vehicleName,
      vehicleLicensePlate: input.vehicleLicensePlate,
      driverResourceId: input.driverResourceId,
      driverName: input.driverName,
      relatedMeetingId: input.relatedMeetingId,
      relatedVisitId: input.relatedVisitId,
      status: "ACTIVE",
      createdAt,
    }
  }
}
