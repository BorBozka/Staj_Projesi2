import { describe, expect, it } from "vitest"

import { MockResourceCatalogService } from "@/services/mock-resource-catalog-service"
import { MockVisitService } from "@/services/mock-visit-service"

const roomInput = {
  type: "ROOM" as const,
  name: "Yeni Toplantı Odası",
  companyId: "bplas",
  facilityId: "bplas-merkez",
}

describe("MockResourceCatalogService", () => {
  it("lists the deterministic resource catalog", async () => {
    const resources = await new MockResourceCatalogService().listResources()

    expect(resources).toHaveLength(5)
    expect(resources.filter((resource) => resource.type === "ROOM")).toHaveLength(2)
    expect(resources.some((resource) => resource.name === "Notebook Havuzu")).toBe(true)
    expect(resources.some((resource) => resource.name === "Projektör Havuzu")).toBe(true)
  })

  it("creates a room without a quantity", async () => {
    const created = await new MockResourceCatalogService().createResource(roomInput)

    expect(created).toMatchObject({ type: "ROOM", name: roomInput.name, isActive: true })
    expect(created.totalQuantity).toBeUndefined()
  })

  it("creates pooled equipment with a valid quantity", async () => {
    const created = await new MockResourceCatalogService().createResource({
      type: "POOLED_EQUIPMENT",
      name: "Konferans Hoparlörü Havuzu",
      companyId: "bplas",
      facilityId: "bplas-arge",
      totalQuantity: 3,
    })

    expect(created.totalQuantity).toBe(3)
  })

  it.each([undefined, 0, -1, 1.5])("rejects invalid pooled-equipment quantity %s", async (totalQuantity) => {
    const service = new MockResourceCatalogService()

    await expect(service.createResource({
      type: "POOLED_EQUIPMENT",
      name: "Geçersiz Havuz",
      companyId: "bplas",
      facilityId: "bplas-merkez",
      totalQuantity,
    })).rejects.toThrow("pozitif bir tam sayı")
  })

  it("rejects a facility that belongs to another company", async () => {
    await expect(new MockResourceCatalogService().createResource({
      ...roomInput,
      facilityId: "otomotiv-uretim",
    })).rejects.toThrow("Şirket ve tesis eşleşmesi geçersiz")
  })

  it("updates a resource while preserving its lifecycle state", async () => {
    const service = new MockResourceCatalogService()
    await service.setResourceActive("resource-room-merkez-atlas", false)
    const updated = await service.updateResource("resource-room-merkez-atlas", {
      ...roomInput,
      name: "Atlas Yönetim Odası",
    })

    expect(updated).toMatchObject({ name: "Atlas Yönetim Odası", isActive: false })
  })

  it("deactivates and reactivates a resource", async () => {
    const service = new MockResourceCatalogService()

    expect((await service.setResourceActive("resource-room-merkez-atlas", false)).isActive).toBe(false)
    expect((await service.setResourceActive("resource-room-merkez-atlas", true)).isActive).toBe(true)
  })

  it("keeps resource types independent from visit types", async () => {
    const created = await new MockResourceCatalogService().createResource(roomInput)

    expect("visitTypeId" in created).toBe(false)
    expect("meetingId" in created).toBe(false)
  })

  it("does not change Meeting or Visit records", async () => {
    const visitService = new MockVisitService()
    const resourceService = new MockResourceCatalogService()
    const meetingsBefore = await visitService.listMeetings()
    const visitsBefore = await visitService.listVisits()

    await resourceService.createResource(roomInput)
    await resourceService.setResourceActive("resource-room-merkez-atlas", false)

    expect(await visitService.listMeetings()).toEqual(meetingsBefore)
    expect(await visitService.listVisits()).toEqual(visitsBefore)
  })
})
