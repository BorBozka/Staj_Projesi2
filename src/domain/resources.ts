export const resourceTypes = ["ROOM", "POOLED_EQUIPMENT"] as const

export type ResourceType = (typeof resourceTypes)[number]

export interface FacilityResource {
  id: string
  type: ResourceType
  name: string
  companyId: string
  companyName: string
  facilityId: string
  facilityName: string
  totalQuantity?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ResourceInput {
  type: ResourceType
  name: string
  companyId: string
  facilityId: string
  totalQuantity?: number
}

export const resourceTypeLabels: Record<ResourceType, string> = {
  ROOM: "Toplantı odası",
  POOLED_EQUIPMENT: "Ekipman havuzu",
}
