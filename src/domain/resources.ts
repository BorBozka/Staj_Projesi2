export const resourceTypes = ["ROOM", "POOLED_EQUIPMENT", "VEHICLE", "DRIVER"] as const

export type ResourceType = (typeof resourceTypes)[number]

interface ResourceBase {
  id: string
  type: ResourceType
  companyId: string
  companyName: string
  facilityId: string
  facilityName: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface RoomResource extends ResourceBase {
  type: "ROOM"
  name: string
}

export interface PooledEquipmentResource extends ResourceBase {
  type: "POOLED_EQUIPMENT"
  name: string
  totalQuantity: number
}

export interface VehicleResource extends ResourceBase {
  type: "VEHICLE"
  brand: string
  model: string
  licensePlate: string
}

export interface DriverResource extends ResourceBase {
  type: "DRIVER"
  fullName: string
  licenseClasses: string[]
  documents: string[]
  canDriveCommercialVehicles: boolean
}

export type FacilityResource = RoomResource | PooledEquipmentResource | VehicleResource | DriverResource

interface ResourceInputBase {
  type: ResourceType
  companyId: string
  facilityId: string
}

export interface RoomResourceInput extends ResourceInputBase {
  type: "ROOM"
  name: string
}

export interface PooledEquipmentResourceInput extends ResourceInputBase {
  type: "POOLED_EQUIPMENT"
  name: string
  totalQuantity: number
}

export interface VehicleResourceInput extends ResourceInputBase {
  type: "VEHICLE"
  brand: string
  model: string
  licensePlate: string
}

export interface DriverResourceInput extends ResourceInputBase {
  type: "DRIVER"
  fullName: string
  licenseClasses: string[]
  documents: string[]
  canDriveCommercialVehicles: boolean
}

export type ResourceInput = RoomResourceInput | PooledEquipmentResourceInput | VehicleResourceInput | DriverResourceInput

export const resourceTypeLabels: Record<ResourceType, string> = {
  ROOM: "Oda",
  POOLED_EQUIPMENT: "Ekipman havuzu",
  VEHICLE: "Araç",
  DRIVER: "Şoför",
}

export function getResourceDisplayName(resource: FacilityResource | ResourceInput) {
  switch (resource.type) {
    case "ROOM":
    case "POOLED_EQUIPMENT":
      return resource.name
    case "VEHICLE":
      return `${resource.brand} ${resource.model}`.trim()
    case "DRIVER":
      return resource.fullName
  }
}
