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
import { MockAccountService } from "@/services/mock-account-service"
import { MockSessionService } from "@/services/mock-session-service"
import { MockAuthenticationStore } from "@/services/mock-authentication-store"
import type { AccountService } from "@/services/account-service"
import type { SessionService } from "@/services/session-service"
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
const _authenticationStore = new MockAuthenticationStore()
const _accountService = new MockAccountService(_authenticationStore)
const _sessionService = new MockSessionService(_authenticationStore)

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
export const accountService: AccountService = _accountService
export const sessionService: SessionService = _sessionService

export type { AccountService, AdminService, GoodsMovementService, ResourceCatalogService, ResourceAssignmentService, SecurityService, SessionService, TransportAssignmentService, VisitService }
