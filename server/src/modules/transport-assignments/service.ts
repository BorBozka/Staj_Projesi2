import { ApiError } from "../../lib/api-error.js"
import type {
  PersistTransportAssignmentInput,
  TransportAssignmentRepository,
} from "../../repositories/transport-assignment-repository.js"
import type { FacilityResource } from "../resources/types.js"
import type {
  CreatePlannedTransportAssignmentInput,
  TransportAvailability,
  TransportAvailabilityInput,
} from "./types.js"

const NOT_EDITABLE = "TRANSPORT_ASSIGNMENT_NOT_EDITABLE"

export class TransportAssignmentService {
  constructor(private readonly repository: TransportAssignmentRepository) {}

  listAssignments() {
    return this.repository.list()
  }

  async getAvailability(input: TransportAvailabilityInput): Promise<TransportAvailability> {
    await this.assertScopeAndTime(input)
    const [{ vehicles, drivers }, overlapping] = await Promise.all([
      this.repository.listActiveResources(input.companyId, input.facilityId),
      this.repository.findOverlappingActive({ plannedStart: input.plannedStart, plannedEnd: input.plannedEnd, excludeAssignmentId: input.excludeAssignmentId }),
    ])
    const busyVehicles = new Set(overlapping.map((item) => item.vehicleResourceId))
    const busyDrivers = new Set(overlapping.map((item) => item.driverResourceId))
    return {
      vehicles: vehicles.filter((vehicle) => !busyVehicles.has(vehicle.id)),
      drivers: drivers.filter((driver) => !busyDrivers.has(driver.id)),
    }
  }

  async createAssignment(input: CreatePlannedTransportAssignmentInput) {
    return this.repository.create(await this.validate(input))
  }

  async updateAssignment(id: string, input: CreatePlannedTransportAssignmentInput) {
    const current = await this.repository.find(id)
    if (!current) throw new ApiError(404, "NOT_FOUND", "Planlı atama bulunamadı.")
    if (current.status === "CANCELLED") throw new ApiError(409, NOT_EDITABLE, "İptal edilen atama düzenlenemez.")
    return this.repository.update(id, await this.validate(input, id))
  }

  async cancelAssignment(id: string) {
    const current = await this.repository.find(id)
    if (!current) throw new ApiError(404, "NOT_FOUND", "Planlı atama bulunamadı.")
    if (current.status === "CANCELLED") throw new ApiError(409, NOT_EDITABLE, "Atama zaten iptal edildi.")
    const result = await this.repository.cancel(id)
    if (!result) throw new ApiError(409, NOT_EDITABLE, "Atama zaten iptal edildi.")
    return result
  }

  private async validate(
    input: CreatePlannedTransportAssignmentInput,
    excludeAssignmentId?: string,
  ): Promise<PersistTransportAssignmentInput> {
    await this.assertScopeAndTime(input)
    const purpose = input.purpose?.trim()
    if (!purpose) throw new ApiError(400, "VALIDATION_ERROR", "Görev/amaç zorunludur.")
    if (input.relatedMeetingId && input.relatedVisitId) {
      throw new ApiError(400, "VALIDATION_ERROR", "Atama yalnızca bir Meeting veya bir Visit ile ilişkilendirilebilir.")
    }

    const vehicle = await this.requireScopedResource(input.vehicleResourceId, "VEHICLE", input)
    const driver = await this.requireScopedResource(input.driverResourceId, "DRIVER", input)
    await this.assertRelatedRecordScope(input)

    const overlapping = await this.repository.findOverlappingActive({
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      excludeAssignmentId,
    })
    if (overlapping.some((item) => item.vehicleResourceId === vehicle.id)) {
      throw new ApiError(409, "TRANSPORT_ASSIGNMENT_CONFLICT", "Seçilen araç bu zaman aralığında müsait değil.")
    }
    if (overlapping.some((item) => item.driverResourceId === driver.id)) {
      throw new ApiError(409, "TRANSPORT_ASSIGNMENT_CONFLICT", "Seçilen şoför bu zaman aralığında müsait değil.")
    }

    return {
      companyId: vehicle.companyId,
      facilityId: vehicle.facilityId,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      purpose,
      vehicleResourceId: vehicle.id,
      vehicleName: `${vehicle.brand} ${vehicle.model}`.trim(),
      vehicleLicensePlate: vehicle.licensePlate,
      driverResourceId: driver.id,
      driverName: driver.fullName,
      relatedMeetingId: input.relatedMeetingId,
      relatedVisitId: input.relatedVisitId,
    }
  }

  private async assertScopeAndTime(input: TransportAvailabilityInput) {
    const start = new Date(input.plannedStart)
    const end = new Date(input.plannedEnd)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() >= end.getTime()) {
      throw new ApiError(400, "VALIDATION_ERROR", "Başlangıç zamanı bitiş zamanından önce olmalıdır.")
    }
    if (!(await this.repository.companyAndFacilityMatch(input.companyId, input.facilityId))) {
      throw new ApiError(400, "INVALID_SCOPE", "Şirket ve tesis eşleşmesi geçersiz.")
    }
  }

  private async requireScopedResource<T extends "VEHICLE" | "DRIVER">(
    resourceId: string,
    type: T,
    input: TransportAvailabilityInput,
  ): Promise<Extract<FacilityResource, { type: T }>> {
    const resource = await this.repository.findResource(resourceId)
    const noun = type === "VEHICLE" ? "Araç" : "Şoför"
    if (!resource || resource.type !== type) throw new ApiError(404, "RESOURCE_NOT_FOUND", `${noun} kaynağı bulunamadı.`)
    if (!resource.isActive) throw new ApiError(409, "RESOURCE_INACTIVE", `Seçilen ${noun.toLocaleLowerCase("tr-TR")} aktif değil.`)
    if (resource.companyId !== input.companyId || resource.facilityId !== input.facilityId) {
      throw new ApiError(400, "INVALID_SCOPE", `${noun} seçilen şirket ve tesise ait değil.`)
    }
    return resource as Extract<FacilityResource, { type: T }>
  }

  private async assertRelatedRecordScope(input: CreatePlannedTransportAssignmentInput) {
    if (input.relatedMeetingId) {
      const scope = await this.repository.findMeetingScope(input.relatedMeetingId)
      if (!scope) throw new ApiError(404, "RELATED_RECORD_NOT_FOUND", "İlişkili Meeting bulunamadı.")
      if (scope.companyId !== input.companyId || scope.facilityId !== input.facilityId) {
        throw new ApiError(400, "INVALID_SCOPE", "İlişkili Meeting seçilen şirket ve tesise ait değil.")
      }
      return
    }
    if (input.relatedVisitId) {
      const scope = await this.repository.findVisitScope(input.relatedVisitId)
      if (!scope) throw new ApiError(404, "RELATED_RECORD_NOT_FOUND", "İlişkili Visit bulunamadı.")
      if (scope.companyId !== input.companyId || scope.facilityId !== input.facilityId) {
        throw new ApiError(400, "INVALID_SCOPE", "İlişkili Visit seçilen şirket ve tesise ait değil.")
      }
    }
  }
}
