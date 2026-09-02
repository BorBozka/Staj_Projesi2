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

/**
 * Runtime service wiring. Every service is a real HTTP adapter talking to the Fastify backend
 * (`VITE_API_BASE_URL`). There is intentionally NO mock fallback: if the backend is unreachable
 * the adapters throw and the UI surfaces the error rather than silently showing seed data. The
 * `Mock*` implementations remain in the tree only as unit/component test fixtures.
 */

export const visitService: VisitService = new HttpVisitService()
export const resourceCatalogService: ResourceCatalogService = new HttpResourceCatalogService()
export const resourceAssignmentService: ResourceAssignmentService = new HttpResourceAssignmentService()
export const transportAssignmentService: TransportAssignmentService = new HttpTransportAssignmentService()
export const goodsMovementService: GoodsMovementService = new HttpGoodsMovementService()
export const adminService: AdminService = new HttpAdminService()
export const securityService: SecurityService = new HttpSecurityService()
export const accountService: AccountService = new HttpAccountService()
export const sessionService: SessionService = new HttpSessionService()
export const reportsService: ReportsService = new HttpReportsService()

export type {
  AccountService,
  AdminService,
  GoodsMovementService,
  ReportsService,
  ResourceCatalogService,
  ResourceAssignmentService,
  SecurityService,
  SessionService,
  TransportAssignmentService,
  VisitService,
}
