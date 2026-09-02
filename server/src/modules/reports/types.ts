import type { GoodsMovementDto } from "../goods/types.js"
import type { PlannedTransportAssignmentDto } from "../transport-assignments/types.js"
import type { VisitDto } from "../visitor-operations/types.js"

/**
 * Canonical Manager reporting query. Only the shared filter-bar dimensions are supported;
 * KPI/chart aggregation stays in the frontend report utilities and is not duplicated here.
 */
export interface ReportsQuery {
  startDate?: string
  endDate?: string
  companyId?: string
  facilityId?: string
}

export interface VisitsReportDataset {
  visits: VisitDto[]
}

export interface FleetReportDataset {
  assignments: PlannedTransportAssignmentDto[]
}

export interface GoodsReportDataset {
  movements: GoodsMovementDto[]
}
