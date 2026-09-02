import { describe, expect, it } from "vitest"

import type { FacilityResource } from "../resources/types.js"
import { TransportAssignmentService } from "./service.js"
import { InMemoryTransportAssignmentRepository } from "./testing/in-memory-transport-assignment-repository.js"
import type { CreatePlannedTransportAssignmentInput } from "./types.js"

const TS = "2026-01-01T00:00:00.000Z"

function vehicle(id: string, facilityId: string, isActive = true): FacilityResource {
  return { id, type: "VEHICLE", companyId: "c1", companyName: "C1", facilityId, facilityName: facilityId, isActive, createdAt: TS, updatedAt: TS, brand: "Ford", model: "Transit", licensePlate: `34 ${id}` }
}
function driver(id: string, facilityId: string, isActive = true): FacilityResource {
  return { id, type: "DRIVER", companyId: "c1", companyName: "C1", facilityId, facilityName: facilityId, isActive, createdAt: TS, updatedAt: TS, fullName: `Şoför ${id}`, licenseClasses: ["B"], documents: [], canDriveCommercialVehicles: false }
}

const RESOURCES: FacilityResource[] = [
  vehicle("veh-1", "f1"),
  vehicle("veh-2", "f1"),
  vehicle("veh-off", "f1", false),
  vehicle("veh-f2", "f2"),
  driver("drv-1", "f1"),
  driver("drv-2", "f1"),
  driver("drv-f2", "f2"),
]

const FIXTURE = {
  resources: RESOURCES,
  facilityScopes: [{ companyId: "c1", facilityId: "f1", companyName: "C1", facilityName: "F1" }],
  meetingScopes: { "mtg-1": { companyId: "c1", facilityId: "f1" }, "mtg-f2": { companyId: "c1", facilityId: "f2" } },
  visitScopes: { "vis-1": { companyId: "c1", facilityId: "f1" }, "vis-f2": { companyId: "c1", facilityId: "f2" } },
}

const base: CreatePlannedTransportAssignmentInput = {
  companyId: "c1",
  facilityId: "f1",
  plannedStart: "2027-01-20T09:00:00.000Z",
  plannedEnd: "2027-01-20T10:00:00.000Z",
  purpose: "Tedarikçi saha ziyareti",
  vehicleResourceId: "veh-1",
  driverResourceId: "drv-1",
}

function makeService() {
  const repository = new InMemoryTransportAssignmentRepository(FIXTURE)
  return { repository, service: new TransportAssignmentService(repository) }
}

describe("TransportAssignmentService — create / snapshot", () => {
  it("creates an ACTIVE assignment with vehicle/driver display snapshots", async () => {
    const { service } = makeService()
    const created = await service.createAssignment(base)
    expect(created).toMatchObject({
      status: "ACTIVE",
      companyId: "c1",
      facilityId: "f1",
      vehicleResourceId: "veh-1",
      vehicleName: "Ford Transit",
      vehicleLicensePlate: "34 veh-1",
      driverResourceId: "drv-1",
      driverName: "Şoför drv-1",
    })
  })

  it("rejects blank purpose, an inverted range, and both Meeting+Visit links", async () => {
    const { service } = makeService()
    await expect(service.createAssignment({ ...base, purpose: "   " })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    await expect(service.createAssignment({ ...base, plannedEnd: base.plannedStart })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    await expect(service.createAssignment({ ...base, relatedMeetingId: "mtg-1", relatedVisitId: "vis-1" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
  })

  it("rejects inactive and out-of-scope catalog resources", async () => {
    const { service } = makeService()
    await expect(service.createAssignment({ ...base, vehicleResourceId: "veh-off" })).rejects.toMatchObject({ code: "RESOURCE_INACTIVE" })
    await expect(service.createAssignment({ ...base, vehicleResourceId: "veh-f2" })).rejects.toMatchObject({ code: "INVALID_SCOPE" })
    await expect(service.createAssignment({ ...base, driverResourceId: "drv-f2" })).rejects.toMatchObject({ code: "INVALID_SCOPE" })
  })
})

describe("TransportAssignmentService — related record scope", () => {
  it("accepts a related Meeting/Visit that matches the assignment scope", async () => {
    const { service } = makeService()
    await expect(service.createAssignment({ ...base, relatedMeetingId: "mtg-1" })).resolves.toMatchObject({ relatedMeetingId: "mtg-1" })
    await expect(service.createAssignment({ ...base, plannedStart: "2027-01-20T11:00:00.000Z", plannedEnd: "2027-01-20T12:00:00.000Z", relatedVisitId: "vis-1" }))
      .resolves.toMatchObject({ relatedVisitId: "vis-1" })
  })

  it("rejects a missing or scope-mismatched related Meeting/Visit", async () => {
    const { service } = makeService()
    await expect(service.createAssignment({ ...base, relatedMeetingId: "mtg-f2" })).rejects.toMatchObject({ code: "INVALID_SCOPE" })
    await expect(service.createAssignment({ ...base, relatedVisitId: "vis-f2" })).rejects.toMatchObject({ code: "INVALID_SCOPE" })
    await expect(service.createAssignment({ ...base, relatedMeetingId: "mtg-missing" })).rejects.toMatchObject({ code: "RELATED_RECORD_NOT_FOUND" })
  })
})

describe("TransportAssignmentService — availability & overlap", () => {
  it("removes a booked vehicle and driver from availability during an overlapping window", async () => {
    const { service } = makeService()
    await service.createAssignment(base)
    const during = await service.getAvailability(base)
    expect(during.vehicles.map((item) => item.id)).not.toContain("veh-1")
    expect(during.drivers.map((item) => item.id)).not.toContain("drv-1")
    expect(during.vehicles.map((item) => item.id)).toContain("veh-2")
  })

  it("rejects a second assignment that overlaps the same vehicle, and separately the same driver", async () => {
    const { service } = makeService()
    await service.createAssignment(base)
    await expect(service.createAssignment({
      ...base, driverResourceId: "drv-2", plannedStart: "2027-01-20T09:30:00.000Z", plannedEnd: "2027-01-20T10:30:00.000Z",
    })).rejects.toMatchObject({ code: "TRANSPORT_ASSIGNMENT_CONFLICT", message: "Seçilen araç bu zaman aralığında müsait değil." })
    await expect(service.createAssignment({
      ...base, vehicleResourceId: "veh-2", plannedStart: "2027-01-20T09:30:00.000Z", plannedEnd: "2027-01-20T10:30:00.000Z",
    })).rejects.toMatchObject({ code: "TRANSPORT_ASSIGNMENT_CONFLICT", message: "Seçilen şoför bu zaman aralığında müsait değil." })
  })

  it("allows a back-to-back assignment whose range only touches the existing one", async () => {
    const { service } = makeService()
    await service.createAssignment(base)
    const created = await service.createAssignment({ ...base, plannedStart: base.plannedEnd, plannedEnd: "2027-01-20T11:00:00.000Z" })
    expect(created.status).toBe("ACTIVE")
  })
})

describe("TransportAssignmentService — update / cancel", () => {
  it("edits an assignment without treating itself as a conflict (excludeAssignmentId)", async () => {
    const { service } = makeService()
    const created = await service.createAssignment(base)
    const updated = await service.updateAssignment(created.id, { ...base, purpose: "Güncel görev", plannedEnd: "2027-01-20T10:30:00.000Z" })
    expect(updated).toMatchObject({ id: created.id, purpose: "Güncel görev", status: "ACTIVE" })
  })

  it("frees both resources on cancel and blocks any further edit or re-cancel", async () => {
    const { service } = makeService()
    const created = await service.createAssignment(base)
    const cancelled = await service.cancelAssignment(created.id)
    expect(cancelled.status).toBe("CANCELLED")

    const availability = await service.getAvailability(base)
    expect(availability.vehicles.map((item) => item.id)).toContain("veh-1")
    expect(availability.drivers.map((item) => item.id)).toContain("drv-1")

    await expect(service.updateAssignment(created.id, base)).rejects.toMatchObject({ code: "TRANSPORT_ASSIGNMENT_NOT_EDITABLE" })
    await expect(service.cancelAssignment(created.id)).rejects.toMatchObject({ code: "TRANSPORT_ASSIGNMENT_NOT_EDITABLE" })
  })
})
