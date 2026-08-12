import { MockVisitService } from "@/services/mock-visit-service"
import { MockResourceCatalogService } from "@/services/mock-resource-catalog-service"
import { MockResourceAssignmentService } from "@/services/mock-resource-assignment-service"
export { managerDashboardService } from "@/services/manager-dashboard-service"
import type { ResourceCatalogService } from "@/services/resource-catalog-service"
import type { ResourceAssignmentService } from "@/services/resource-assignment-service"
import type { VisitService } from "@/services/visit-service"

export const visitService: VisitService = new MockVisitService()
export const resourceCatalogService: ResourceCatalogService = new MockResourceCatalogService()
export const resourceAssignmentService: ResourceAssignmentService = new MockResourceAssignmentService(
  visitService,
  resourceCatalogService,
)

export type { ResourceCatalogService, ResourceAssignmentService, VisitService }
