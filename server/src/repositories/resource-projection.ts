import { parseResourceType, type FacilityResource } from "../modules/resources/types.js"

// Shared read-side projection for catalog resources. Phase 4's assignment and transport
// repositories need the same discriminated FacilityResource shape the catalog repository
// already exposes; this keeps one mapper for the new code paths.
export const RESOURCE_INCLUDE = {
  company: { select: { name: true } },
  facility: { select: { name: true } },
  driverLicenseClasses: { select: { value: true } },
  driverDocuments: { select: { name: true } },
} as const

export interface ResourceRow {
  id: string
  type: string
  companyId: string
  facilityId: string
  name: string | null
  totalQuantity: number | null
  brand: string | null
  model: string | null
  licensePlate: string | null
  fullName: string | null
  canDriveCommercialVehicles: boolean | null
  active: boolean
  createdAt: Date
  updatedAt: Date
  company: { name: string }
  facility: { name: string }
  driverLicenseClasses: { value: string }[]
  driverDocuments: { name: string }[]
}

export function toFacilityResource(row: ResourceRow): FacilityResource {
  const base = {
    id: row.id,
    companyId: row.companyId,
    companyName: row.company.name,
    facilityId: row.facilityId,
    facilityName: row.facility.name,
    isActive: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
  switch (parseResourceType(row.type)) {
    case "ROOM":
      if (!row.name) throw new Error("Invalid ROOM resource.")
      return { ...base, type: "ROOM", name: row.name }
    case "POOLED_EQUIPMENT":
      if (!row.name || row.totalQuantity === null) throw new Error("Invalid POOLED_EQUIPMENT resource.")
      return { ...base, type: "POOLED_EQUIPMENT", name: row.name, totalQuantity: row.totalQuantity }
    case "VEHICLE":
      if (!row.brand || !row.model || !row.licensePlate) throw new Error("Invalid VEHICLE resource.")
      return { ...base, type: "VEHICLE", brand: row.brand, model: row.model, licensePlate: row.licensePlate }
    case "DRIVER":
      if (!row.fullName || row.canDriveCommercialVehicles === null) throw new Error("Invalid DRIVER resource.")
      return {
        ...base,
        type: "DRIVER",
        fullName: row.fullName,
        licenseClasses: row.driverLicenseClasses.map((item) => item.value),
        documents: row.driverDocuments.map((item) => item.name),
        canDriveCommercialVehicles: row.canDriveCommercialVehicles,
      }
    default:
      throw new Error("Unsupported persisted resource type.")
  }
}
