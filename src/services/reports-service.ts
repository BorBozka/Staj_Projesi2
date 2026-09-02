import type { GoodsMovement } from "@/domain/goods-movements"
import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import type { Visit } from "@/domain/visits"

/**
 * Shared filter for a reports dataset request. `companyId`/`facilityId` accept the UI's
 * `"all"` sentinel; the backend resolves it to the caller's authorization scope.
 */
export interface ReportsDatasetQuery {
  startDate?: string
  endDate?: string
  companyId?: string
  facilityId?: string
}

/**
 * Thin boundary over the Phase 4 reporting endpoints. It returns the raw canonical record
 * arrays the existing report utilities (KPI / chart / comparison / export) already consume —
 * no aggregation happens here or on the server.
 */
export interface ReportsService {
  getVisitsDataset(query: ReportsDatasetQuery): Promise<Visit[]>
  getFleetDataset(query: ReportsDatasetQuery): Promise<PlannedTransportAssignment[]>
  getGoodsDataset(query: ReportsDatasetQuery): Promise<GoodsMovement[]>
}
