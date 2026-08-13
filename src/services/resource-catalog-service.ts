import type { FacilityResource, ResourceInput } from "@/domain/resources"

export interface ResourceCatalogService {
  listResources(): Promise<FacilityResource[]>
  createResource(input: ResourceInput): Promise<FacilityResource>
  updateResource(id: string, input: ResourceInput): Promise<FacilityResource>
  setResourceActive(id: string, isActive: boolean): Promise<FacilityResource>
  deleteResource(id: string): Promise<void>
}
