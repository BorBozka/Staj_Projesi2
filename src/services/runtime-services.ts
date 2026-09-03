import type { AppMode } from "@/config/app-mode"
import { HttpAccountService } from "@/services/http/http-account-service"
import { HttpAdminService } from "@/services/http/http-admin-service"
import { HttpGoodsMovementService } from "@/services/http/http-goods-movement-service"
import { HttpReportsService } from "@/services/http/http-reports-service"
import { HttpResourceAssignmentService } from "@/services/http/http-resource-assignment-service"
import { HttpResourceCatalogService } from "@/services/http/http-resource-catalog-service"
import { HttpSecurityService } from "@/services/http/http-security-service"
import { HttpSessionService } from "@/services/http/http-session-service"
import { HttpTransportAssignmentService } from "@/services/http/http-transport-assignment-service"
import { HttpVisitService } from "@/services/http/http-visit-service"
import { MockAccountService } from "@/services/mock-account-service"
import { MockAdminService } from "@/services/mock-admin-service"
import { MockAuthenticationStore } from "@/services/mock-authentication-store"
import { MockGoodsMovementService } from "@/services/mock-goods-movement-service"
import { MockOrganizationStore } from "@/services/mock-organization-store"
import { MockReportsService } from "@/services/mock-reports-service"
import { MockResourceAssignmentService } from "@/services/mock-resource-assignment-service"
import { MockResourceCatalogService } from "@/services/mock-resource-catalog-service"
import { MockSecurityService } from "@/services/mock-security-service"
import { MockSessionService } from "@/services/mock-session-service"
import { MockTransportAssignmentService } from "@/services/mock-transport-assignment-service"
import { MockVisitService } from "@/services/mock-visit-service"
import { toDemoVisitCurrentEmployee } from "@/services/mock-visit-data"
import { MockVisitTypeStore } from "@/services/mock-visit-type-store"
import { MockVisitorCardStore } from "@/services/mock-visitor-card-store"
import { MockVisitorRuleStore } from "@/services/mock-visitor-rule-store"
import type { AccountService } from "@/services/account-service"
import type { AdminService } from "@/services/admin-service"
import type { GoodsMovementService } from "@/services/goods-movement-service"
import type { ReportsService } from "@/services/reports-service"
import type { ResourceAssignmentService } from "@/services/resource-assignment-service"
import type { ResourceCatalogService } from "@/services/resource-catalog-service"
import type { SecurityService } from "@/services/security-service"
import type { SessionService } from "@/services/session-service"
import type { TransportAssignmentService } from "@/services/transport-assignment-service"
import type { VisitService } from "@/services/visit-service"

export interface RuntimeServices {
  visitService: VisitService
  resourceCatalogService: ResourceCatalogService
  resourceAssignmentService: ResourceAssignmentService
  transportAssignmentService: TransportAssignmentService
  goodsMovementService: GoodsMovementService
  adminService: AdminService
  securityService: SecurityService
  accountService: AccountService
  sessionService: SessionService
  reportsService: ReportsService
}

function createApiServices(): RuntimeServices {
  return {
    visitService: new HttpVisitService(),
    resourceCatalogService: new HttpResourceCatalogService(),
    resourceAssignmentService: new HttpResourceAssignmentService(),
    transportAssignmentService: new HttpTransportAssignmentService(),
    goodsMovementService: new HttpGoodsMovementService(),
    adminService: new HttpAdminService(),
    securityService: new HttpSecurityService(),
    accountService: new HttpAccountService(),
    sessionService: new HttpSessionService(),
    reportsService: new HttpReportsService(),
  }
}

function createDemoServices(): RuntimeServices {
  const organizationStore = new MockOrganizationStore()
  const visitTypeStore = new MockVisitTypeStore()
  const visitorCardStore = new MockVisitorCardStore()
  const visitorRuleStore = new MockVisitorRuleStore()
  // Session is created first so Visit reference data reflects the signed-in demo user, matching
  // how the API path resolves identity server-side.
  const authenticationStore = new MockAuthenticationStore()
  const accountService = new MockAccountService(authenticationStore)
  const sessionService = new MockSessionService(authenticationStore)
  const visitService = new MockVisitService(
    undefined,
    organizationStore,
    visitTypeStore,
    () => toDemoVisitCurrentEmployee(sessionService.peekSession()),
  )
  const resourceCatalogService = new MockResourceCatalogService(organizationStore)
  const resourceAssignmentService = new MockResourceAssignmentService(
    visitService,
    resourceCatalogService,
  )
  const transportAssignmentService = new MockTransportAssignmentService(
    visitService,
    resourceCatalogService,
  )
  const goodsMovementService = new MockGoodsMovementService(visitService)
  const adminService = new MockAdminService(
    organizationStore,
    undefined,
    visitTypeStore,
    visitorCardStore,
    visitorRuleStore,
  )
  const securityService = new MockSecurityService(
    visitorCardStore,
    visitService,
    visitorRuleStore,
  )
  // Break the lifecycle dependency cycle using the same composition as the pre-Phase 5 runtime.
  visitService.setResourceAssignmentService(resourceAssignmentService)

  return {
    visitService,
    resourceCatalogService,
    resourceAssignmentService,
    transportAssignmentService,
    goodsMovementService,
    adminService,
    securityService,
    accountService,
    sessionService,
    reportsService: new MockReportsService(
      visitService,
      transportAssignmentService,
      goodsMovementService,
    ),
  }
}

export function createRuntimeServices(mode: AppMode): RuntimeServices {
  return mode === "demo" ? createDemoServices() : createApiServices()
}
