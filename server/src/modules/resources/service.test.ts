import { describe, expect, it } from "vitest"
import { ResourceService } from "./service.js"
import { InMemoryResourceRepository } from "./testing/in-memory-resource-repository.js"

describe("ResourceService", () => {
  it("enforces vehicle and driver-specific fields", async () => {
    const service = new ResourceService(new InMemoryResourceRepository([], [{ companyId: "company-1", facilityId: "facility-1" }]))
    await expect(service.create({ type: "VEHICLE", companyId: "company-1", facilityId: "facility-1", brand: "", model: "Transit", licensePlate: "34 AB 1" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    await expect(service.create({ type: "DRIVER", companyId: "company-1", facilityId: "facility-1", fullName: "Şoför", licenseClasses: [], documents: [], canDriveCommercialVehicles: true })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
  })
  it("normalizes plates, prevents duplicates, and keeps resource type immutable", async () => {
    const service = new ResourceService(new InMemoryResourceRepository([], [{ companyId: "company-1", facilityId: "facility-1" }]))
    const vehicle = await service.create({ type: "VEHICLE", companyId: "company-1", facilityId: "facility-1", brand: "Ford", model: "Transit", licensePlate: "34  ab  1" })
    expect(vehicle).toMatchObject({ type: "VEHICLE", licensePlate: "34 AB 1" })
    await expect(service.create({ type: "VEHICLE", companyId: "company-1", facilityId: "facility-1", brand: "Ford", model: "Transit", licensePlate: "34 AB 1" })).rejects.toMatchObject({ code: "DUPLICATE_LICENSE_PLATE" })
    await expect(service.update(vehicle.id, { type: "DRIVER", companyId: "company-1", facilityId: "facility-1", fullName: "Şoför", licenseClasses: ["B"], documents: [], canDriveCommercialVehicles: false })).rejects.toMatchObject({ code: "RESOURCE_TYPE_IMMUTABLE" })
  })
})
