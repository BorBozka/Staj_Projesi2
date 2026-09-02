export const resourceTypes = ["ROOM", "POOLED_EQUIPMENT", "VEHICLE", "DRIVER"] as const
export type ResourceType = typeof resourceTypes[number]

interface ResourceBase { id: string; type: ResourceType; companyId: string; companyName: string; facilityId: string; facilityName: string; isActive: boolean; createdAt: string; updatedAt: string }
export interface RoomResource extends ResourceBase { type: "ROOM"; name: string }
export interface PooledEquipmentResource extends ResourceBase { type: "POOLED_EQUIPMENT"; name: string; totalQuantity: number }
export interface VehicleResource extends ResourceBase { type: "VEHICLE"; brand: string; model: string; licensePlate: string }
export interface DriverResource extends ResourceBase { type: "DRIVER"; fullName: string; licenseClasses: string[]; documents: string[]; canDriveCommercialVehicles: boolean }
export type FacilityResource = RoomResource | PooledEquipmentResource | VehicleResource | DriverResource

export type ResourceInput =
  | { type: "ROOM"; companyId: string; facilityId: string; name: string }
  | { type: "POOLED_EQUIPMENT"; companyId: string; facilityId: string; name: string; totalQuantity: number }
  | { type: "VEHICLE"; companyId: string; facilityId: string; brand: string; model: string; licensePlate: string }
  | { type: "DRIVER"; companyId: string; facilityId: string; fullName: string; licenseClasses: string[]; documents: string[]; canDriveCommercialVehicles: boolean }

export function parseResourceType(value: string): ResourceType | null { return resourceTypes.find((type) => type === value) ?? null }
export function normalizeLicensePlate(value: string) { return value.trim().replace(/\s+/g, " ").toUpperCase() }
