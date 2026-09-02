import { appMode } from "@/config/app-mode"
import { createRuntimeServices } from "@/services/runtime-services"
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
 * Runtime service wiring is selected explicitly at build time. API mode remains the default and
 * never falls back when the backend is unavailable. Demo mode is a frontend-only portfolio
 * composition using the existing deterministic mock services.
 */

const runtimeServices = createRuntimeServices(appMode)

export const visitService: VisitService = runtimeServices.visitService
export const resourceCatalogService: ResourceCatalogService = runtimeServices.resourceCatalogService
export const resourceAssignmentService: ResourceAssignmentService = runtimeServices.resourceAssignmentService
export const transportAssignmentService: TransportAssignmentService = runtimeServices.transportAssignmentService
export const goodsMovementService: GoodsMovementService = runtimeServices.goodsMovementService
export const adminService: AdminService = runtimeServices.adminService
export const securityService: SecurityService = runtimeServices.securityService
export const accountService: AccountService = runtimeServices.accountService
export const sessionService: SessionService = runtimeServices.sessionService
export const reportsService: ReportsService = runtimeServices.reportsService

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
