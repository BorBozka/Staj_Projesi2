import { apiClient, type QueryParams } from "@/lib/http"
import type { GoodsMovement } from "@/domain/goods-movements"
import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import type { Visit } from "@/domain/visits"
import type { ReportsDatasetQuery, ReportsService } from "@/services/reports-service"
import { mapVisit, type VisitDto } from "@/services/http/mappers"

function toQuery(query: ReportsDatasetQuery): QueryParams {
  return {
    startDate: query.startDate || undefined,
    endDate: query.endDate || undefined,
    companyId: query.companyId || undefined,
    facilityId: query.facilityId || undefined,
  }
}

/** Uses `GET /api/reports/{visits,fleet,goods}`; the server scopes and date-filters each set. */
export class HttpReportsService implements ReportsService {
  async getVisitsDataset(query: ReportsDatasetQuery): Promise<Visit[]> {
    const { visits } = await apiClient.get<{ visits: VisitDto[] }>("/reports/visits", { query: toQuery(query) })
    return visits.map(mapVisit)
  }

  async getFleetDataset(query: ReportsDatasetQuery): Promise<PlannedTransportAssignment[]> {
    const { assignments } = await apiClient.get<{ assignments: PlannedTransportAssignment[] }>("/reports/fleet", {
      query: toQuery(query),
    })
    return assignments
  }

  async getGoodsDataset(query: ReportsDatasetQuery): Promise<GoodsMovement[]> {
    const { movements } = await apiClient.get<{ movements: GoodsMovement[] }>("/reports/goods", { query: toQuery(query) })
    return movements
  }
}
