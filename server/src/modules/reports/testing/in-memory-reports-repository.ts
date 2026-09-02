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
      (!filter.companyId || visit.meeting.hostCompanyId === filter.companyId)
      && (!filter.facilityId || visit.meeting.facilityId === filter.facilityId)
      && withinInstant(visit.meeting.plannedStart, filter)))
  }

  async listFleet(filter: InstantRangeFilter) {
    return clone(this.assignments.filter((assignment) =>
      (!filter.companyId || assignment.companyId === filter.companyId)
      && (!filter.facilityId || assignment.facilityId === filter.facilityId)
      && withinInstant(assignment.plannedStart, filter)))
  }

  async listGoods(filter: DateRangeFilter) {
    return clone(this.movements.filter((movement) =>
      (!filter.companyId || movement.companyId === filter.companyId)
      && (!filter.facilityId || movement.facilityId === filter.facilityId)
      && (!filter.startDate || movement.plannedDate >= filter.startDate)
      && (!filter.endDate || movement.plannedDate <= filter.endDate)))
  }
}
