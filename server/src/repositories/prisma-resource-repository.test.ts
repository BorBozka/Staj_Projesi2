import type { PrismaClient } from "@prisma/client"
import { describe, expect, it, vi } from "vitest"
import type { ResourceInput } from "../modules/resources/types.js"
import { PrismaResourceRepository } from "./prisma-resource-repository.js"

const timestamp = new Date("2026-09-02T09:00:00.000Z")

function rowFor(input: ResourceInput) {
  return {
    id: "resource-1",
    type: input.type,
    companyId: input.companyId,
    facilityId: input.facilityId,
    name: input.type === "ROOM" || input.type === "POOLED_EQUIPMENT" ? input.name : null,
    totalQuantity: input.type === "POOLED_EQUIPMENT" ? input.totalQuantity : null,
    brand: input.type === "VEHICLE" ? input.brand : null,
    model: input.type === "VEHICLE" ? input.model : null,
    licensePlate: input.type === "VEHICLE" ? input.licensePlate : null,
    fullName: input.type === "DRIVER" ? input.fullName : null,
    canDriveCommercialVehicles: input.type === "DRIVER" ? input.canDriveCommercialVehicles : null,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    company: { name: "Acme" },
    facility: { name: "Merkez" },
    driverLicenseClasses: input.type === "DRIVER" ? input.licenseClasses.map((value) => ({ value })) : [],
    driverDocuments: input.type === "DRIVER" ? input.documents.map((name) => ({ name })) : [],
  }
}

function repositoryFor(input: ResourceInput) {
  const create = vi.fn().mockResolvedValue(rowFor(input))
  const update = vi.fn().mockResolvedValue(rowFor(input))
  const prisma = { resource: { create, update } } as unknown as PrismaClient
  return { repository: new PrismaResourceRepository(prisma), create, update }
}

describe("PrismaResourceRepository resource relation payloads", () => {
  it.each([
    { type: "ROOM", companyId: "company-1", facilityId: "facility-1", name: "Toplantı Odası" },
    { type: "POOLED_EQUIPMENT", companyId: "company-1", facilityId: "facility-1", name: "Projektör", totalQuantity: 3 },
    { type: "VEHICLE", companyId: "company-1", facilityId: "facility-1", brand: "Ford", model: "Transit", licensePlate: "34 ABC 123" },
  ] satisfies ResourceInput[])("does not send driver relation mutations when creating $type", async (input) => {
    const { repository, create } = repositoryFor(input)

    await repository.save(input)

    const data = create.mock.calls[0][0].data
    expect(data).not.toHaveProperty("driverLicenseClasses")
    expect(data).not.toHaveProperty("driverDocuments")
  })

  it("uses nested create only when creating a driver", async () => {
    const input = { type: "DRIVER", companyId: "company-1", facilityId: "facility-1", fullName: "Ayşe Yılmaz", licenseClasses: ["B", "D"], documents: ["SRC", "Psikoteknik"], canDriveCommercialVehicles: true } satisfies ResourceInput
    const { repository, create } = repositoryFor(input)

    await repository.save(input)

    const data = create.mock.calls[0][0].data
    expect(data.driverLicenseClasses).toEqual({ create: [{ value: "B" }, { value: "D" }] })
    expect(data.driverDocuments).toEqual({ create: [{ name: "SRC" }, { name: "Psikoteknik" }] })
    expect(data.driverLicenseClasses).not.toHaveProperty("deleteMany")
    expect(data.driverDocuments).not.toHaveProperty("deleteMany")
  })

  it("replaces driver relations when updating a driver", async () => {
    const input = { type: "DRIVER", companyId: "company-1", facilityId: "facility-1", fullName: "Ayşe Yılmaz", licenseClasses: ["E"], documents: ["Yeni Belge"], canDriveCommercialVehicles: true } satisfies ResourceInput
    const { repository, update } = repositoryFor(input)

    await repository.save(input, "resource-1")

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "resource-1" },
      data: expect.objectContaining({
        type: "DRIVER",
        driverLicenseClasses: { deleteMany: {}, create: [{ value: "E" }] },
        driverDocuments: { deleteMany: {}, create: [{ name: "Yeni Belge" }] },
      }),
    }))
  })
})
