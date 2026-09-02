import { apiClient } from "@/lib/http"
import type { FacilityResource, ResourceInput } from "@/domain/resources"
import type { ResourceCatalogService } from "@/services/resource-catalog-service"

/**
 * Resource catalog over `/api/resources`. The catalog page shows inactive rows too, so the
 * list request always asks for them; the page applies its own company/facility/type/state
 * filters client-side.
 */
export class HttpResourceCatalogService implements ResourceCatalogService {
  listResources(): Promise<FacilityResource[]> {
    return apiClient.get<FacilityResource[]>("/resources", { query: { includeInactive: "true" } })
  }

  createResource(input: ResourceInput): Promise<FacilityResource> {
    return apiClient.post<FacilityResource>("/resources", input)
  }

  updateResource(id: string, input: ResourceInput): Promise<FacilityResource> {
    return apiClient.patch<FacilityResource>(`/resources/${encodeURIComponent(id)}`, input)
  }

  setResourceActive(id: string, isActive: boolean): Promise<FacilityResource> {
    return apiClient.patch<FacilityResource>(`/resources/${encodeURIComponent(id)}/status`, { active: isActive })
  }

  async deleteResource(id: string): Promise<void> {
    await apiClient.delete<void>(`/resources/${encodeURIComponent(id)}`)
  }
}
