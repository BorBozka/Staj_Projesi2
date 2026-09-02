import type {
  DateRangeFilter,
  InstantRangeFilter,
  ReportsRepository,
} from "../../../repositories/reports-repository.js"
import type { GoodsMovementDto } from "../../goods/types.js"
import type { PlannedTransportAssignmentDto } from "../../transport-assignments/types.js"
import type { VisitDto } from "../../visitor-operations/types.js"

const clone = <T>(value: T): T => structuredClone(value)

export interface ReportsFixture {
  visits?: VisitDto[]
  assignments?: PlannedTransportAssignmentDto[]
  movements?: GoodsMovementDto[]
}

function withinInstant(value: string, filter: InstantRangeFilter): boolean {
  const time = new Date(value).getTime()
  if (filter.from && time < filter.from.getTime()) return false
  if (filter.to && time > filter.to.getTime()) return false
  return true
}

function companyMatch(filter: { companyId?: string; companyIds?: string[] }, companyId: string): boolean {
  if (filter.companyIds) return filter.companyIds.includes(companyId)
  return !filter.companyId || filter.companyId === companyId
}

function facilityMatch(filter: { facilityId?: string; facilityIds?: string[] }, facilityId: string): boolean {
  if (filter.facilityIds) return filter.facilityIds.includes(facilityId)
  return !filter.facilityId || filter.facilityId === facilityId
}

export class InMemoryReportsRepository implements ReportsRepository {
  private readonly visits: VisitDto[]
  private readonly assignments: PlannedTransportAssignmentDto[]
  private readonly movements: GoodsMovementDto[]

  constructor(fixture: ReportsFixture = {}) {
    this.visits = clone(fixture.visits ?? [])
    this.assignments = clone(fixture.assignments ?? [])
    this.movements = clone(fixture.movements ?? [])
  }

  async listVisits(filter: InstantRangeFilter) {
    return clone(this.visits.filter((visit) =>
      companyMatch(filter, visit.meeting.hostCompanyId)
      && facilityMatch(filter, visit.meeting.facilityId)
      && withinInstant(visit.meeting.plannedStart, filter)))
  }

  async listFleet(filter: InstantRangeFilter) {
    return clone(this.assignments.filter((assignment) =>
      companyMatch(filter, assignment.companyId)
      && facilityMatch(filter, assignment.facilityId)
      && withinInstant(assignment.plannedStart, filter)))
  }

  async listGoods(filter: DateRangeFilter) {
    return clone(this.movements.filter((movement) =>
      companyMatch(filter, movement.companyId)
      && facilityMatch(filter, movement.facilityId)
      && (!filter.startDate || movement.plannedDate >= filter.startDate)
      && (!filter.endDate || movement.plannedDate <= filter.endDate)))
  }
}
