import { MockVisitService } from "@/services/mock-visit-service"
import { MockResourceCatalogService } from "@/services/mock-resource-catalog-service"
import { MockResourceAssignmentService } from "@/services/mock-resource-assignment-service"
import { MockTransportAssignmentService } from "@/services/mock-transport-assignment-service"
import { MockGoodsMovementService } from "@/services/mock-goods-movement-service"
import { MockAdminService } from "@/services/mock-admin-service"
import { MockSecurityService } from "@/services/mock-security-service"
import { MockVisitorCardStore } from "@/services/mock-visitor-card-store"
import { MockVisitorRuleStore } from "@/services/mock-visitor-rule-store"
import { MockOrganizationStore } from "@/services/mock-organization-store"
import { MockVisitTypeStore } from "@/services/mock-visit-type-store"
import type { AdminService } from "@/services/admin-service"
import type { SecurityService } from "@/services/security-service"
import type { GoodsMovementService } from "@/services/goods-movement-service"
import type { ResourceCatalogService } from "@/services/resource-catalog-service"
import type { ResourceAssignmentService } from "@/services/resource-assignment-service"
import type { TransportAssignmentService } from "@/services/transport-assignment-service"
import type { VisitService } from "@/services/visit-service"

const _organizationStore = new MockOrganizationStore()
const _visitTypeStore = new MockVisitTypeStore()
const _visitorCardStore = new MockVisitorCardStore()
const _visitorRuleStore = new MockVisitorRuleStore()
const _visitService = new MockVisitService(undefined, _organizationStore, _visitTypeStore)
const _resourceCatalogService = new MockResourceCatalogService(_organizationStore)
const _resourceAssignmentService = new MockResourceAssignmentService(_visitService, _resourceCatalogService)
const _transportAssignmentService = new MockTransportAssignmentService(_visitService, _resourceCatalogService)
const _goodsMovementService = new MockGoodsMovementService(_visitService)
const _adminService = new MockAdminService(_organizationStore, undefined, _visitTypeStore, _visitorCardStore, _visitorRuleStore)
const _securityService = new MockSecurityService(_visitorCardStore, _visitService, _visitorRuleStore)

// Break the circular dependency: visit service needs assignment service for
// extension validation; assignment service needs visit service for meeting data.
_visitService.setResourceAssignmentService(_resourceAssignmentService)

export const visitService: VisitService = _visitService
export const resourceCatalogService: ResourceCatalogService = _resourceCatalogService
export const resourceAssignmentService: ResourceAssignmentService = _resourceAssignmentService
export const transportAssignmentService: TransportAssignmentService = _transportAssignmentService
export const goodsMovementService: GoodsMovementService = _goodsMovementService
export const adminService: AdminService = _adminService
export const securityService: SecurityService = _securityService

export type { AdminService, GoodsMovementService, ResourceCatalogService, ResourceAssignmentService, SecurityService, TransportAssignmentService, VisitService }
