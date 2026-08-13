import { describe, expect, it } from "vitest"

import type { ResourceInput } from "@/domain/resources"
import { MockResourceCatalogService } from "@/services/mock-resource-catalog-service"
import { MockVisitService } from "@/services/mock-visit-service"

const roomInput = {
  type: "ROOM" as const,
  name: "Yeni Toplantı Odası",
  companyId: "bplas",
  facilityId: "bplas-merkez",
}

const vehicleInput = {
  type: "VEHICLE" as const,
  brand: "Ford",
  model: "Transit",
  licensePlate: "16 BPL 303",
  companyId: "bplas",
  facilityId: "bplas-merkez",
}

const driverInput = {
  type: "DRIVER" as const,
  fullName: "Selin Yılmaz",
  licenseClasses: ["B", "C"],
  documents: ["SRC2"],
  canDriveCommercialVehicles: true,
  companyId: "bplas",
  facilityId: "bplas-merkez",
}

describe("MockResourceCatalogService", () => {
  it("lists all four resource types in the deterministic catalog", async () => {
    const resources = await new MockResourceCatalogService().listResources()

    expect(resources).toHaveLength(9)
    expect(resources.filter((resource) => resource.type === "ROOM")).toHaveLength(2)
    expect(resources.filter((resource) => resource.type === "POOLED_EQUIPMENT")).toHaveLength(3)
    expect(resources.filter((resource) => resource.type === "VEHICLE")).toHaveLength(2)
    expect(resources.filter((resource) => resource.type === "DRIVER")).toHaveLength(2)
  })

  it("creates a room without a quantity", async () => {
    const created = await new MockResourceCatalogService().createResource(roomInput)

    expect(created).toMatchObject({ type: "ROOM", name: roomInput.name, isActive: true })
    expect("totalQuantity" in created).toBe(false)
  })

  it("creates pooled equipment with a valid quantity", async () => {
    const created = await new MockResourceCatalogService().createResource({
      type: "POOLED_EQUIPMENT",
      name: "Konferans Hoparlörü Havuzu",
      companyId: "bplas",
      facilityId: "bplas-arge",
      totalQuantity: 3,
    })

    expect(created.type === "POOLED_EQUIPMENT" && created.totalQuantity).toBe(3)
  })

  it.each([undefined, 0, -1, 1.5])("rejects invalid pooled-equipment quantity %s", async (totalQuantity) => {
    const service = new MockResourceCatalogService()

    await expect(service.createResource({
      type: "POOLED_EQUIPMENT",
      name: "Geçersiz Havuz",
      companyId: "bplas",
      facilityId: "bplas-merkez",
      totalQuantity,
    } as ResourceInput)).rejects.toThrow("pozitif bir tam sayı")
  })

  it("creates a vehicle with separate brand, model, and plate fields", async () => {
    const created = await new MockResourceCatalogService().createResource(vehicleInput)

    expect(created).toMatchObject({ ...vehicleInput, isActive: true })
    expect("name" in created).toBe(false)
    expect("totalQuantity" in created).toBe(false)
  })

  it("normalizes vehicle plates and rejects duplicates within the same company", async () => {
    const service = new MockResourceCatalogService()
    const created = await service.createResource({ ...vehicleInput, licensePlate: " 16  bpl\t303 " })

    expect(created.type === "VEHICLE" && created.licensePlate).toBe("16 BPL 303")
    await expect(service.createResource({ ...vehicleInput, facilityId: "bplas-arge", licensePlate: "16 bpl 303" }))
      .rejects.toThrow("aynı plakaya sahip bir araç zaten kayıtlı")
  })

  it("allows the same vehicle plate at another company", async () => {
    const created = await new MockResourceCatalogService().createResource({
      ...vehicleInput,
      companyId: "bplas-otomotiv",
      facilityId: "otomotiv-uretim",
      licensePlate: "16 BPL 101",
    })

    expect(created.type === "VEHICLE" && created.licensePlate).toBe("16 BPL 101")
  })

  it("rejects a duplicate vehicle plate when updating a vehicle", async () => {
    const service = new MockResourceCatalogService()
    await service.createResource({ ...vehicleInput, licensePlate: "16 BPL 303" })

    await expect(service.updateResource("resource-vehicle-transit-merkez", {
      ...vehicleInput,
      licensePlate: "16 bpl 303",
    })).rejects.toThrow("aynı plakaya sahip bir araç zaten kayıtlı")
  })

  it.each(["brand", "model", "licensePlate"] as const)("rejects a vehicle without %s", async (field) => {
    await expect(new MockResourceCatalogService().createResource({ ...vehicleInput, [field]: " " })).rejects.toThrow("zorunludur")
  })

  it("creates and updates driver documents and commercial authorization", async () => {
    const service = new MockResourceCatalogService()
    const created = await service.createResource(driverInput)
    const updated = await service.updateResource(created.id, {
      ...driverInput,
      documents: ["SRC4", "Psikoteknik"],
      canDriveCommercialVehicles: false,
    })

    expect(updated).toMatchObject({
      type: "DRIVER",
      documents: ["SRC4", "Psikoteknik"],
      canDriveCommercialVehicles: false,
    })
    expect("totalQuantity" in updated).toBe(false)
  })

  it("rejects a driver without a license class", async () => {
    await expect(new MockResourceCatalogService().createResource({ ...driverInput, licenseClasses: [" "] })).rejects.toThrow("ehliyet sınıfı")
  })

  it.each<ResourceInput>([
    roomInput,
    { type: "POOLED_EQUIPMENT", name: "Notebook", totalQuantity: 2, companyId: "bplas", facilityId: "bplas-merkez" },
    vehicleInput,
    driverInput,
  ])("rejects a company-facility mismatch for $type", async (input) => {
    await expect(new MockResourceCatalogService().createResource({ ...input, facilityId: "otomotiv-uretim" })).rejects.toThrow("Şirket ve tesis eşleşmesi geçersiz")
  })

  it("updates a vehicle and a driver without changing their types", async () => {
    const service = new MockResourceCatalogService()
    const vehicle = await service.updateResource("resource-vehicle-transit-merkez", { ...vehicleInput, model: "Tourneo" })
    const driver = await service.updateResource("resource-driver-ayse-demir", { ...driverInput, fullName: "Ayşe Yıldız" })

    expect(vehicle).toMatchObject({ type: "VEHICLE", model: "Tourneo" })
    expect(driver).toMatchObject({ type: "DRIVER", fullName: "Ayşe Yıldız" })
  })

  it("does not allow changing a resource type during editing", async () => {
    await expect(new MockResourceCatalogService().updateResource("resource-room-merkez-atlas", vehicleInput)).rejects.toThrow("türü düzenleme sırasında değiştirilemez")
  })

  it.each(["resource-vehicle-transit-merkez", "resource-driver-ayse-demir"])("deactivates and reactivates %s", async (id) => {
    const service = new MockResourceCatalogService()

    expect((await service.setResourceActive(id, false)).isActive).toBe(false)
    expect((await service.setResourceActive(id, true)).isActive).toBe(true)
  })

  it.each([
    ["ROOM", "resource-room-arge-pusula"],
    ["POOLED_EQUIPMENT", "resource-projector-arge"],
    ["VEHICLE", "resource-vehicle-transit-merkez"],
    ["DRIVER", "resource-driver-ayse-demir"],
  ] as const)("hard-deletes a %s catalog record", async (_type, id) => {
    const service = new MockResourceCatalogService()

    await service.deleteResource(id)

    expect((await service.listResources()).some((resource) => resource.id === id)).toBe(false)
    await expect(service.setResourceActive(id, false)).rejects.toThrow("Kaynak bulunamadı")
    await expect(service.deleteResource(id)).rejects.toThrow("Kaynak bulunamadı")
  })

  it("keeps resource types independent from visit types", async () => {
    const created = await new MockResourceCatalogService().createResource(vehicleInput)

    expect("visitTypeId" in created).toBe(false)
    expect("meetingId" in created).toBe(false)
  })

  it("does not change Meeting or Visit records", async () => {
    const visitService = new MockVisitService()
    const resourceService = new MockResourceCatalogService()
    const meetingsBefore = await visitService.listMeetings()
    const visitsBefore = await visitService.listVisits()

    await resourceService.createResource(driverInput)
    await resourceService.setResourceActive("resource-vehicle-transit-merkez", false)
    await resourceService.deleteResource("resource-driver-mehmet-kaya")

    expect(await visitService.listMeetings()).toEqual(meetingsBefore)
    expect(await visitService.listVisits()).toEqual(visitsBefore)
  })
})
