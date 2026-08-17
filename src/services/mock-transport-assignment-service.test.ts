import { describe, expect, it } from "vitest"

import { MockResourceCatalogService } from "@/services/mock-resource-catalog-service"
import { MockTransportAssignmentService } from "@/services/mock-transport-assignment-service"
import { MockVisitService } from "@/services/mock-visit-service"

const baseInput = {
  companyId: "bplas",
  facilityId: "bplas-merkez",
  plannedStart: "2027-01-20T09:00:00.000Z",
  plannedEnd: "2027-01-20T10:00:00.000Z",
  purpose: "Tedarikçi saha ziyareti",
  vehicleResourceId: "resource-vehicle-transit-merkez",
  driverResourceId: "resource-driver-ayse-demir",
}

function makeServices() {
  const visitService = new MockVisitService()
  const catalogService = new MockResourceCatalogService()
  const transportService = new MockTransportAssignmentService(visitService, catalogService)
  return { visitService, catalogService, transportService }
}

describe("MockTransportAssignmentService", () => {
  it("creates a standalone plan with one vehicle and one driver without changing catalog or visits", async () => {
    const { visitService, catalogService, transportService } = makeServices()
    const visitsBefore = await visitService.listVisits()
    const resourcesBefore = await catalogService.listResources()

    const created = await transportService.createAssignment(baseInput)

    expect(created).toMatchObject({
      companyId: "bplas",
      facilityId: "bplas-merkez",
      vehicleResourceId: baseInput.vehicleResourceId,
      driverResourceId: baseInput.driverResourceId,
      vehicleName: "Ford Transit",
      driverName: "Ayşe Demir",
      status: "ACTIVE",
    })
    expect(created.relatedMeetingId).toBeUndefined()
    expect(created.relatedVisitId).toBeUndefined()
    expect(await visitService.listVisits()).toEqual(visitsBefore)
    expect(await catalogService.listResources()).toEqual(resourcesBefore)
  })

  it("returns only active scoped resources and removes both conflicting resources from availability", async () => {
    const { transportService } = makeServices()
    const before = await transportService.getAvailability(baseInput)
    expect(before.vehicles.map((resource) => resource.id)).toContain(baseInput.vehicleResourceId)
    expect(before.drivers.map((resource) => resource.id)).toContain(baseInput.driverResourceId)

    await transportService.createAssignment(baseInput)

    const during = await transportService.getAvailability(baseInput)
    expect(during.vehicles.map((resource) => resource.id)).not.toContain(baseInput.vehicleResourceId)
    expect(during.drivers.map((resource) => resource.id)).not.toContain(baseInput.driverResourceId)
  })

  it("uses half-open intervals so adjacent plans remain available", async () => {
    const { transportService } = makeServices()
    await transportService.createAssignment(baseInput)

    const availability = await transportService.getAvailability({
      ...baseInput,
      plannedStart: baseInput.plannedEnd,
      plannedEnd: "2027-01-20T11:00:00.000Z",
    })

    expect(availability.vehicles.map((resource) => resource.id)).toContain(baseInput.vehicleResourceId)
    expect(availability.drivers.map((resource) => resource.id)).toContain(baseInput.driverResourceId)
  })

  it("treats an untimed daily reservation as conflicting with every timed interval on that day", async () => {
    const { transportService } = makeServices()
    await transportService.createAssignment({
      ...baseInput,
      plannedStart: "2027-01-20T00:00:00.000Z",
      plannedEnd: "2027-01-21T00:00:00.000Z",
    })

    const availability = await transportService.getAvailability({
      ...baseInput,
      plannedStart: "2027-01-20T15:00:00.000Z",
      plannedEnd: "2027-01-20T16:00:00.000Z",
    })

    expect(availability.vehicles.map((resource) => resource.id)).not.toContain(baseInput.vehicleResourceId)
    expect(availability.drivers.map((resource) => resource.id)).not.toContain(baseInput.driverResourceId)
  })

  it("detects real overlap across equivalent UTC offsets", async () => {
    const { transportService } = makeServices()
    await transportService.createAssignment({
      ...baseInput,
      plannedStart: "2027-01-20T12:00:00+03:00",
      plannedEnd: "2027-01-20T14:00:00+03:00",
    })

    const availability = await transportService.getAvailability({
      ...baseInput,
      plannedStart: "2027-01-20T09:30:00.000Z",
      plannedEnd: "2027-01-20T12:00:00.000Z",
    })

    expect(availability.vehicles.map((resource) => resource.id)).not.toContain(baseInput.vehicleResourceId)
    expect(availability.drivers.map((resource) => resource.id)).not.toContain(baseInput.driverResourceId)
  })

  it("rejects an overlap at the service boundary and preserves prior assignments", async () => {
    const { transportService } = makeServices()
    const initialAssignments = await transportService.listAssignments()
    await transportService.createAssignment(baseInput)

    await expect(transportService.createAssignment({
      ...baseInput,
      plannedStart: "2027-01-20T09:30:00.000Z",
      plannedEnd: "2027-01-20T10:30:00.000Z",
    })).rejects.toThrow("müsait değil")

    expect(await transportService.listAssignments()).toHaveLength(initialAssignments.length + 1)
  })

  it("rejects inactive and out-of-scope catalog resources at the service boundary", async () => {
    const { catalogService, transportService } = makeServices()
    await catalogService.setResourceActive(baseInput.vehicleResourceId, false)
    await expect(transportService.createAssignment(baseInput)).rejects.toThrow("aktif değil")
    await catalogService.setResourceActive(baseInput.vehicleResourceId, true)

    await expect(transportService.createAssignment({
      ...baseInput,
      driverResourceId: "resource-driver-mehmet-kaya",
    })).rejects.toThrow("şirket ve tesise ait değil")
  })

  it("validates required time range and optional linked-record scope", async () => {
    const { transportService } = makeServices()
    await expect(transportService.createAssignment({
      ...baseInput,
      plannedEnd: baseInput.plannedStart,
    })).rejects.toThrow("Başlangıç zamanı")

    await expect(transportService.createAssignment({
      ...baseInput,
      purpose: " ",
    })).rejects.toThrow("Görev/amaç")

    await expect(transportService.createAssignment({
      ...baseInput,
      relatedVisitId: "v-105",
    })).rejects.toThrow("İlişkili Visit seçilen şirket ve tesise ait değil")
  })

  it("edits an active assignment without self-conflict", async () => {
    const { transportService } = makeServices()
    const created = await transportService.createAssignment(baseInput)

    const availability = await transportService.getAvailability({ ...baseInput, excludeAssignmentId: created.id })
    expect(availability.vehicles.map((resource) => resource.id)).toContain(baseInput.vehicleResourceId)
    expect(availability.drivers.map((resource) => resource.id)).toContain(baseInput.driverResourceId)

    const updated = await transportService.updateAssignment(created.id, {
      ...baseInput,
      purpose: "Güncellenen saha görevi",
      plannedEnd: "2027-01-20T10:30:00.000Z",
    })

    expect(updated).toMatchObject({ id: created.id, purpose: "Güncellenen saha görevi", status: "ACTIVE" })
  })

  it("cancels a plan, frees both resources, and prevents further editing", async () => {
    const { transportService } = makeServices()
    const created = await transportService.createAssignment(baseInput)
    const cancelled = await transportService.cancelAssignment(created.id)

    expect(cancelled.status).toBe("CANCELLED")
    const availability = await transportService.getAvailability(baseInput)
    expect(availability.vehicles.map((resource) => resource.id)).toContain(baseInput.vehicleResourceId)
    expect(availability.drivers.map((resource) => resource.id)).toContain(baseInput.driverResourceId)
    await expect(transportService.updateAssignment(created.id, baseInput)).rejects.toThrow("İptal edilen atama düzenlenemez")
  })
})
