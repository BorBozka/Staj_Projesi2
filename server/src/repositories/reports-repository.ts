import type { PrismaClient } from "@prisma/client"

import type { GoodsMovementDto } from "../modules/goods/types.js"
import type { PlannedTransportAssignmentDto } from "../modules/transport-assignments/types.js"
import type { VisitDto } from "../modules/visitor-operations/types.js"
import { GOODS_MOVEMENT_INCLUDE, toGoodsMovementDto } from "./goods-movement-repository.js"
import { TRANSPORT_ASSIGNMENT_INCLUDE, toTransportAssignmentDto } from "./transport-assignment-repository.js"
import { toVisit, visitInclude } from "./visitor-operations-repository.js"

/**
 * `companyIds`/`facilityIds` (when present) are the authorization-scoped id sets a report is
 * confined to — an empty array therefore matches nothing. They take precedence over the single
 * `companyId`/`facilityId`, which stay for direct (unscoped) unit-test use.
 */

/** Date-range on a genuine instant column (Meeting.plannedStart, TransportAssignment.plannedStart). */
export interface InstantRangeFilter {
  companyId?: string
  facilityId?: string
  companyIds?: string[]
  facilityIds?: string[]
  from?: Date
  to?: Date
}

/** Date-range on a date-only column (GoodsMovement.plannedDate). */
export interface DateRangeFilter {
  companyId?: string
  facilityId?: string
  companyIds?: string[]
  facilityIds?: string[]
  startDate?: string
  endDate?: string
}

function companyWhere(filter: { companyId?: string; companyIds?: string[] }, field: string) {
  if (filter.companyIds) return { [field]: { in: filter.companyIds } }
  if (filter.companyId) return { [field]: filter.companyId }
  return {}
}

function facilityWhere(filter: { facilityId?: string; facilityIds?: string[] }) {
  if (filter.facilityIds) return { facilityId: { in: filter.facilityIds } }
  if (filter.facilityId) return { facilityId: filter.facilityId }
  return {}
}

export interface ReportsRepository {
  listVisits(filter: InstantRangeFilter): Promise<VisitDto[]>
  listFleet(filter: InstantRangeFilter): Promise<PlannedTransportAssignmentDto[]>
  listGoods(filter: DateRangeFilter): Promise<GoodsMovementDto[]>
}

function instantRange(filter: InstantRangeFilter) {
  if (!filter.from && !filter.to) return {}
  return { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) }
}

export class PrismaReportsRepository implements ReportsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listVisits(filter: InstantRangeFilter) {
    const range = instantRange(filter)
    const rows = await this.prisma.visit.findMany({
      where: {
        meeting: {
          ...companyWhere(filter, "hostCompanyId"),
          ...facilityWhere(filter),
          ...(Object.keys(range).length > 0 ? { plannedStart: range } : {}),
        },
      },
      include: visitInclude,
      orderBy: { meeting: { plannedStart: "desc" } },
    })
    return rows.map(toVisit)
  }

  async listFleet(filter: InstantRangeFilter) {
    const range = instantRange(filter)
    const rows = await this.prisma.transportAssignment.findMany({
      where: {
        ...companyWhere(filter, "companyId"),
        ...facilityWhere(filter),
        ...(Object.keys(range).length > 0 ? { plannedStart: range } : {}),
      },
      include: TRANSPORT_ASSIGNMENT_INCLUDE,
      orderBy: { plannedStart: "desc" },
    })
    return rows.map(toTransportAssignmentDto)
  }

  async listGoods(filter: DateRangeFilter) {
    const range = {
      ...(filter.startDate ? { gte: new Date(`${filter.startDate}T00:00:00.000Z`) } : {}),
      ...(filter.endDate ? { lte: new Date(`${filter.endDate}T00:00:00.000Z`) } : {}),
    }
    const rows = await this.prisma.goodsMovement.findMany({
      where: {
        ...companyWhere(filter, "companyId"),
        ...facilityWhere(filter),
        ...(Object.keys(range).length > 0 ? { plannedDate: range } : {}),
      },
      include: GOODS_MOVEMENT_INCLUDE,
      orderBy: [{ plannedDate: "desc" }, { plannedTime: "desc" }, { createdAt: "desc" }],
    })
    return rows.map(toGoodsMovementDto)
  }
}
