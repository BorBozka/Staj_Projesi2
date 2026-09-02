import type { Prisma, PrismaClient } from "@prisma/client"
import { parseResourceType, type FacilityResource, type ResourceInput } from "../modules/resources/types.js"
import type { ResourceRepository } from "./resource-repository.js"

const include = { company: { select: { name: true } }, facility: { select: { name: true } }, driverLicenseClasses: { select: { value: true } }, driverDocuments: { select: { name: true } } } as const
type Row = { id: string; type: string; companyId: string; facilityId: string; name: string | null; totalQuantity: number | null; brand: string | null; model: string | null; licensePlate: string | null; fullName: string | null; canDriveCommercialVehicles: boolean | null; active: boolean; createdAt: Date; updatedAt: Date; company: { name: string }; facility: { name: string }; driverLicenseClasses: { value: string }[]; driverDocuments: { name: string }[] }

function toResource(row: Row): FacilityResource {
  const base = { id: row.id, companyId: row.companyId, companyName: row.company.name, facilityId: row.facilityId, facilityName: row.facility.name, isActive: row.active, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }
  switch (parseResourceType(row.type)) {
    case "ROOM": if (!row.name) throw new Error("Invalid ROOM resource."); return { ...base, type: "ROOM", name: row.name }
    case "POOLED_EQUIPMENT": if (!row.name || !row.totalQuantity) throw new Error("Invalid POOLED_EQUIPMENT resource."); return { ...base, type: "POOLED_EQUIPMENT", name: row.name, totalQuantity: row.totalQuantity }
    case "VEHICLE": if (!row.brand || !row.model || !row.licensePlate) throw new Error("Invalid VEHICLE resource."); return { ...base, type: "VEHICLE", brand: row.brand, model: row.model, licensePlate: row.licensePlate }
    case "DRIVER": if (!row.fullName || row.canDriveCommercialVehicles === null) throw new Error("Invalid DRIVER resource."); return { ...base, type: "DRIVER", fullName: row.fullName, licenseClasses: row.driverLicenseClasses.map((item) => item.value), documents: row.driverDocuments.map((item) => item.name), canDriveCommercialVehicles: row.canDriveCommercialVehicles }
    default: throw new Error("Unsupported persisted resource type.")
  }
}

function createData(input: ResourceInput, active: boolean): Prisma.ResourceUncheckedCreateInput {
  const empty = { name: null, totalQuantity: null, brand: null, model: null, licensePlate: null, fullName: null, canDriveCommercialVehicles: null }
  switch (input.type) {
    case "ROOM": return { ...empty, type: input.type, companyId: input.companyId, facilityId: input.facilityId, name: input.name, active }
    case "POOLED_EQUIPMENT": return { ...empty, type: input.type, companyId: input.companyId, facilityId: input.facilityId, name: input.name, totalQuantity: input.totalQuantity, active }
    case "VEHICLE": return { ...empty, type: input.type, companyId: input.companyId, facilityId: input.facilityId, brand: input.brand, model: input.model, licensePlate: input.licensePlate, active }
    case "DRIVER": return { ...empty, type: input.type, companyId: input.companyId, facilityId: input.facilityId, fullName: input.fullName, canDriveCommercialVehicles: input.canDriveCommercialVehicles, active, driverLicenseClasses: { create: input.licenseClasses.map((value) => ({ value })) }, driverDocuments: { create: input.documents.map((name) => ({ name })) } }
  }
}

function updateData(input: ResourceInput): Prisma.ResourceUncheckedUpdateInput {
  const empty = { name: null, totalQuantity: null, brand: null, model: null, licensePlate: null, fullName: null, canDriveCommercialVehicles: null }
  switch (input.type) {
    case "ROOM": return { ...empty, type: input.type, companyId: input.companyId, facilityId: input.facilityId, name: input.name }
    case "POOLED_EQUIPMENT": return { ...empty, type: input.type, companyId: input.companyId, facilityId: input.facilityId, name: input.name, totalQuantity: input.totalQuantity }
    case "VEHICLE": return { ...empty, type: input.type, companyId: input.companyId, facilityId: input.facilityId, brand: input.brand, model: input.model, licensePlate: input.licensePlate }
    case "DRIVER": return { ...empty, type: input.type, companyId: input.companyId, facilityId: input.facilityId, fullName: input.fullName, canDriveCommercialVehicles: input.canDriveCommercialVehicles, driverLicenseClasses: { deleteMany: {}, create: input.licenseClasses.map((value) => ({ value })) }, driverDocuments: { deleteMany: {}, create: input.documents.map((name) => ({ name })) } }
  }
}

export class PrismaResourceRepository implements ResourceRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async list(filters: { includeInactive: boolean; companyId?: string; facilityId?: string; type?: string }) { const rows = await this.prisma.resource.findMany({ where: { ...(filters.includeInactive ? {} : { active: true }), ...(filters.companyId ? { companyId: filters.companyId } : {}), ...(filters.facilityId ? { facilityId: filters.facilityId } : {}), ...(filters.type ? { type: filters.type } : {}) }, include, orderBy: { createdAt: "asc" } }); return rows.map(toResource) }
  async find(id: string) { const row = await this.prisma.resource.findUnique({ where: { id }, include }); return row ? toResource(row) : null }
  async save(input: ResourceInput, id?: string, active = true) { const row = id ? await this.prisma.resource.update({ where: { id }, data: updateData(input), include }) : await this.prisma.resource.create({ data: createData(input, active), include }); return toResource(row) }
  async setActive(id: string, active: boolean) { return toResource(await this.prisma.resource.update({ where: { id }, data: { active }, include })) }
  async delete(id: string) { await this.prisma.$transaction([this.prisma.driverLicenseClass.deleteMany({ where: { resourceId: id } }), this.prisma.driverDocument.deleteMany({ where: { resourceId: id } }), this.prisma.resource.delete({ where: { id } })]) }
  async companyAndFacilityExist(companyId: string, facilityId: string) { return Boolean(await this.prisma.facility.findFirst({ where: { id: facilityId, companyId }, select: { id: true } })) }
  async findVehicleByCompanyAndPlate(companyId: string, licensePlate: string, excludeId?: string) { const row = await this.prisma.resource.findFirst({ where: { type: "VEHICLE", companyId, licensePlate, ...(excludeId ? { id: { not: excludeId } } : {}) }, include }); return row ? toResource(row) : null }
}
