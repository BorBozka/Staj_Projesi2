import { MockVisitService } from "@/services/mock-visit-service"
import { MockResourceCatalogService } from "@/services/mock-resource-catalog-service"
export { managerDashboardService } from "@/services/manager-dashboard-service"
import type { ResourceCatalogService } from "@/services/resource-catalog-service"
import type { VisitService } from "@/services/visit-service"

export const visitService: VisitService = new MockVisitService()
export const resourceCatalogService: ResourceCatalogService = new MockResourceCatalogService()

export type { ResourceCatalogService, VisitService }
