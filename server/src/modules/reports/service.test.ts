import { describe, expect, it } from "vitest"

import type { GoodsMovementDto } from "../goods/types.js"
import type { PlannedTransportAssignmentDto } from "../transport-assignments/types.js"
import type { MeetingDto, VisitDto } from "../visitor-operations/types.js"
import { ReportsService } from "./service.js"
import { InMemoryReportsRepository } from "./testing/in-memory-reports-repository.js"

const TS = "2026-01-01T00:00:00.000Z"

function meeting(id: string, plannedStart: string, companyId: string, facilityId: string): MeetingDto {
  return {
    id, creatorEmployeeId: "e1", visitTypeId: "t1", visitTypeName: "Toplantı",
    hostEmployeeName: "Host", hostCompanyId: companyId, hostCompanyName: companyId,
    facilityId, facilityName: facilityId, plannedStart, plannedEnd: plannedStart,
    hasAdditionalRequirements: false, createdAt: TS, updatedAt: TS,
  }
}
function visit(id: string, plannedStart: string, companyId: string, facilityId: string): VisitDto {
  return {
    id, meetingId: `m-${id}`,
    visitor: { id: `vr-${id}`, firstName: "Ada", lastName: "Yılmaz", company: "Acme" },
    status: "PLANNED", invitationStatus: "NOT_SENT", createdAt: TS, updatedAt: TS,
    meeting: meeting(`m-${id}`, plannedStart, companyId, facilityId),
  }
}
function assignment(id: string, plannedStart: string, companyId: string, facilityId: string): PlannedTransportAssignmentDto {
  return {
    id, companyId, companyName: companyId, facilityId, facilityName: facilityId,
    plannedStart, plannedEnd: plannedStart, purpose: "Görev",
    vehicleResourceId: "v1", vehicleName: "Ford Transit", vehicleLicensePlate: "34 AB 1",
    driverResourceId: "d1", driverName: "Şoför", status: "ACTIVE", createdAt: TS,
  }
}
function movement(id: string, plannedDate: string, companyId: string, facilityId: string): GoodsMovementDto {
  return {
    id, direction: "INBOUND", companyId, companyName: companyId, facilityId, facilityName: facilityId,
    counterpartyName: "Tedarik", plannedDate, goodsDescription: "Palet", status: "PLANNED", createdAt: TS,
  }
}

function makeService() {
  const repository = new InMemoryReportsRepository({
    visits: [
      visit("early", "2026-09-02T09:00:00.000Z", "c1", "f1"),
      visit("late", "2026-09-10T09:00:00.000Z", "c1", "f2"),
      visit("other-company", "2026-09-02T09:00:00.000Z", "c2", "f9"),
    ],
    assignments: [
      assignment("a-early", "2026-09-02T09:00:00.000Z", "c1", "f1"),
      assignment("a-late", "2026-09-10T09:00:00.000Z", "c1", "f1"),
    ],
    movements: [
      movement("g-early", "2026-09-02", "c1", "f1"),
      movement("g-late", "2026-09-10", "c1", "f1"),
      movement("g-edge-end", "2026-09-05", "c1", "f1"),
    ],
  })
  return new ReportsService(repository)
}

describe("ReportsService — date / company / facility filtering", () => {
  it("filters visits by an inclusive local-day range", async () => {
    const service = makeService()
    const { visits } = await service.getVisitsReport({ startDate: "2026-09-01", endDate: "2026-09-05" })
    expect(visits.map((item) => item.id)).toEqual(["early", "other-company"])
  })

  it("filters visits by company and facility", async () => {
    const service = makeService()
    const scoped = await service.getVisitsReport({ companyId: "c1", facilityId: "f1" })
    expect(scoped.visits.map((item) => item.id)).toEqual(["early"])
    const companyOnly = await service.getVisitsReport({ companyId: "c1" })
    expect(companyOnly.visits.map((item) => item.id).sort()).toEqual(["early", "late"])
  })

  it("treats 'all' as no filter and an inverted range as empty", async () => {
    const service = makeService()
    const all = await service.getVisitsReport({ companyId: "all", facilityId: "all" })
    expect(all.visits).toHaveLength(3)
    const inverted = await service.getVisitsReport({ startDate: "2026-09-10", endDate: "2026-09-01" })
    expect(inverted.visits).toHaveLength(0)
  })

  it("filters fleet assignments by planned-start range and scope", async () => {
    const service = makeService()
    const { assignments } = await service.getFleetReport({ startDate: "2026-09-01", endDate: "2026-09-05", companyId: "c1" })
    expect(assignments.map((item) => item.id)).toEqual(["a-early"])
  })

  it("filters goods movements by inclusive planned-date range", async () => {
    const service = makeService()
    const { movements } = await service.getGoodsReport({ startDate: "2026-09-02", endDate: "2026-09-05" })
    expect(movements.map((item) => item.id).sort()).toEqual(["g-early", "g-edge-end"])
    const inverted = await service.getGoodsReport({ startDate: "2026-09-05", endDate: "2026-09-02" })
    expect(inverted.movements).toHaveLength(0)
  })

  it("rejects a malformed date", async () => {
    const service = makeService()
    await expect(service.getVisitsReport({ startDate: "2026-13-40" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
  })

  it("rejects a well-formed but non-existent calendar date on either bound (strict validation regression)", async () => {
    const service = makeService()
    await expect(service.getVisitsReport({ startDate: "2026-02-31" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    await expect(service.getGoodsReport({ endDate: "2025-02-29" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    await expect(service.getFleetReport({ startDate: "2026-04-31", endDate: "2026-05-01" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
  })
})
