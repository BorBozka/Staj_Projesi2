import type { DriverResource, VehicleResource } from "../resources/types.js"

export const transportAssignmentStatuses = ["ACTIVE", "CANCELLED"] as const
export type TransportAssignmentStatus = (typeof transportAssignmentStatuses)[number]

export interface PlannedTransportAssignmentDto {
  id: string
  companyId: string
  companyName: string
  facilityId: string
  facilityName: string
  plannedStart: string
  plannedEnd: string
  purpose: string
  vehicleResourceId: string
  vehicleName: string
  vehicleLicensePlate: string
  driverResourceId: string
  driverName: string
  relatedMeetingId?: string
  relatedVisitId?: string
  status: TransportAssignmentStatus
  createdAt: string
}

export interface CreatePlannedTransportAssignmentInput {
  companyId: string
  facilityId: string
  plannedStart: string
  plannedEnd: string
  purpose: string
  vehicleResourceId: string
  driverResourceId: string
  relatedMeetingId?: string
  relatedVisitId?: string
}

export interface TransportAvailabilityInput {
  companyId: string
  facilityId: string
  plannedStart: string
  plannedEnd: string
  excludeAssignmentId?: string
}

export interface TransportAvailability {
  vehicles: VehicleResource[]
  drivers: DriverResource[]
}
