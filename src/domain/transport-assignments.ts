import type { DriverResource, VehicleResource } from "@/domain/resources"

export interface PlannedTransportAssignment {
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
  status: "ACTIVE" | "CANCELLED"
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
