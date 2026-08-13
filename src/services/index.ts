import { MockVisitService } from "@/services/mock-visit-service"
import { MockResourceCatalogService } from "@/services/mock-resource-catalog-service"
import { MockResourceAssignmentService } from "@/services/mock-resource-assignment-service"
export { managerDashboardService } from "@/services/manager-dashboard-service"
import type { ResourceCatalogService } from "@/services/resource-catalog-service"
import type { ResourceAssignmentService } from "@/services/resource-assignment-service"
import type { VisitService } from "@/services/visit-service"

const _visitService = new MockVisitService()
const _resourceCatalogService = new MockResourceCatalogService()
const _resourceAssignmentService = new MockResourceAssignmentService(_visitService, _resourceCatalogService)

// Break the circular dependency: visit service needs assignment service for
// extension validation; assignment service needs visit service for meeting data.
_visitService.setResourceAssignmentService(_resourceAssignmentService)

export const visitService: VisitService = _visitService
export const resourceCatalogService: ResourceCatalogService = _resourceCatalogService
export const resourceAssignmentService: ResourceAssignmentService = _resourceAssignmentService

export type { ResourceCatalogService, ResourceAssignmentService, VisitService }
