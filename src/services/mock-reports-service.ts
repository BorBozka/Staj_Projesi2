import type { GoodsMovement } from "@/domain/goods-movements"
import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import type { Visit } from "@/domain/visits"
import type { GoodsMovementService } from "@/services/goods-movement-service"
import type { ReportsService } from "@/services/reports-service"
import type { TransportAssignmentService } from "@/services/transport-assignment-service"
import type { VisitService } from "@/services/visit-service"

/**
 * Dev/test fixture. Returns the full mock record sets; the report utilities apply the
 * date/company/facility filtering, exactly as they do against the real scoped endpoints.
 */
export class MockReportsService implements ReportsService {
  constructor(
    private readonly visitService: VisitService,
    private readonly transportAssignmentService: TransportAssignmentService,
    private readonly goodsMovementService: GoodsMovementService,
  ) {}

  async getVisitsDataset(): Promise<Visit[]> {
    return this.visitService.listVisits()
  }

  async getFleetDataset(): Promise<PlannedTransportAssignment[]> {
    return this.transportAssignmentService.listAssignments()
  }

  async getGoodsDataset(): Promise<GoodsMovement[]> {
    return this.goodsMovementService.listGoodsMovements()
  }
}
