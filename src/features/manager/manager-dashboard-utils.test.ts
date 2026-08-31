import { describe, expect, it } from "vitest"

import type { GoodsMovement } from "@/domain/goods-movements"
import type { Visit, VisitStatus } from "@/domain/visits"
import { getActiveTransportAssignments, getDashboardVisitStatus, getDelayMinutes, getNextPlannedVisits, getOperationBins, getOtherVisits, getScopedVisits, getStatusCounts, getTodayScopedGoodsMovements, getTodayScopedTransportAssignments, getTodayVisits, isVisitOverdue } from "./manager-dashboard-utils"

function makeVisit(id: string, status: VisitStatus, plannedStart: string, overrides: Partial<Visit> = {}): Visit {
  return {
    id,
    meetingId: `meeting-${id}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: `visitor-${id}`, firstName: id, lastName: "Ziyaretçi", email: `${id}@example.com`, company: "Test A.Ş." },
    visitTypeId: "meeting",
    visitTypeName: "Toplantı",
    hostEmployeeId: "host-1",
    hostEmployeeName: "Maya Kara",
    hostCompanyId: "bplas",
    hostCompanyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart,
    plannedEnd: "2026-08-10T12:00:00+03:00",
    status,
    invitationStatus: "SENT",
    hasAdditionalRequirements: false,
    createdAt: plannedStart,
    updatedAt: plannedStart,
    ...overrides,
  }
}

describe("manager dashboard calculations", () => {
  const now = new Date("2026-08-10T12:15:00+03:00")
  const visits = [
    makeVisit("Ayça", "PLANNED", "2026-08-10T09:00:00+03:00"),
    makeVisit("Cem", "CHECKED_IN", "2026-08-10T10:00:00+03:00", { actualCheckIn: "2026-08-10T10:10:00+03:00", plannedEnd: "2026-08-10T11:30:00+03:00" }),
    makeVisit("Derya", "CHECKED_OUT", "2026-08-10T10:00:00+03:00", { facilityId: "bplas-arge", facilityName: "Ar-Ge Merkezi" }),
    makeVisit("Geçmiş", "PLANNED", "2026-08-09T10:00:00+03:00"),
  ]

  it("applies company/facility scope and derives today’s visit set", () => {
    expect(getScopedVisits(visits, { companyId: "bplas", facilityId: "bplas-merkez" }).map((visit) => visit.id)).toEqual(["Ayça", "Cem", "Geçmiş"])
    expect(getTodayVisits(visits, now).map((visit) => visit.id)).toEqual(["Ayça", "Cem", "Derya"])
  })

  it("builds hourly planned, actual and delivery bins", () => {
    const deliveries: GoodsMovement[] = [
      { id: "delivery-1", direction: "INBOUND", companyId: "bplas", companyName: "BPLAS", facilityId: "bplas-merkez", facilityName: "Merkez", counterpartyName: "Tedarikçi", plannedDate: "2026-08-10", plannedTime: "19:00", goodsDescription: "Parça", status: "PLANNED", createdAt: "2026-08-10T08:00:00+03:00" },
      { id: "delivery-2", direction: "OUTBOUND", companyId: "bplas", companyName: "BPLAS", facilityId: "bplas-merkez", facilityName: "Merkez", counterpartyName: "Gece Tedarikçisi", plannedDate: "2026-08-10", plannedTime: "23:30", goodsDescription: "Sevkiyat", status: "PLANNED", createdAt: "2026-08-10T08:00:00+03:00" },
      { id: "delivery-3", direction: "INBOUND", companyId: "bplas", companyName: "BPLAS", facilityId: "bplas-merkez", facilityName: "Merkez", counterpartyName: "Saati yok", plannedDate: "2026-08-10", goodsDescription: "Günlük kayıt", status: "PLANNED", createdAt: "2026-08-10T08:00:00+03:00" },
    ]
    const assignments = [{
      id: "transport-1", companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-merkez", facilityName: "Merkez Tesis", plannedStart: "2026-08-10T19:00:00+03:00", plannedEnd: "2026-08-10T20:00:00+03:00", purpose: "Saha görevi", vehicleResourceId: "vehicle-1", vehicleName: "Transit", vehicleLicensePlate: "16 BPL 101", driverResourceId: "driver-1", driverName: "Ayşe Demir", status: "ACTIVE" as const, createdAt: "2026-08-10T08:00:00+03:00",
    }]
    const bins = getOperationBins(getTodayVisits(visits, now), deliveries, assignments)

    expect(bins.find((bin) => bin.hour === 10)).toMatchObject({ planned: 2, actual: 1 })
    expect(bins.find((bin) => bin.hour === 19)?.deliveries).toHaveLength(1)
    expect(bins.find((bin) => bin.hour === 23)?.deliveries).toHaveLength(1)
    expect(bins.flatMap((bin) => bin.deliveries).map((delivery) => delivery.id)).not.toContain("delivery-3")
    expect(bins.find((bin) => bin.hour === 19)?.transportAssignments).toHaveLength(1)
  })

  it("selects only today's planned, timed goods movements for dashboard markers", () => {
    const base = { direction: "INBOUND" as const, companyId: "bplas", companyName: "BPLAS", facilityId: "bplas-merkez", facilityName: "Merkez", counterpartyName: "Tedarikçi", plannedDate: "2026-08-10", plannedTime: "19:00", goodsDescription: "Parça", status: "PLANNED" as const, createdAt: "2026-08-10T08:00:00+03:00" }
    const movements: GoodsMovement[] = [
      { ...base, id: "timed-today" },
      { ...base, id: "without-time", plannedTime: undefined },
      { ...base, id: "other-day", plannedDate: "2026-08-11" },
      { ...base, id: "completed", status: "COMPLETED" },
      { ...base, id: "other-facility", facilityId: "bplas-arge" },
    ]

    const selected = getTodayScopedGoodsMovements(movements, { companyId: "bplas", facilityId: "bplas-merkez" }, now)
    expect(selected.map((movement) => movement.id)).toEqual(["timed-today"])
    expect(getOperationBins([], selected, []).find((bin) => bin.hour === 19)?.deliveries.map((movement) => movement.id)).toEqual(["timed-today"])
  })

  it("selects only currently active Fleet assignments in scope", () => {
    const assignments = [
      { id: "active", companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-merkez", facilityName: "Merkez Tesis", plannedStart: "2026-08-10T12:00:00+03:00", plannedEnd: "2026-08-10T13:00:00+03:00", purpose: "Aktif", vehicleResourceId: "vehicle", vehicleName: "Transit", vehicleLicensePlate: "16 BPL 101", driverResourceId: "driver", driverName: "Ayşe Demir", status: "ACTIVE" as const, createdAt: "2026-08-10T08:00:00+03:00" },
      { id: "cancelled", companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-merkez", facilityName: "Merkez Tesis", plannedStart: "2026-08-10T12:00:00+03:00", plannedEnd: "2026-08-10T13:00:00+03:00", purpose: "İptal", vehicleResourceId: "vehicle", vehicleName: "Transit", vehicleLicensePlate: "16 BPL 101", driverResourceId: "driver", driverName: "Ayşe Demir", status: "CANCELLED" as const, createdAt: "2026-08-10T08:00:00+03:00" },
    ]
    expect(getActiveTransportAssignments(assignments, { companyId: "bplas", facilityId: "bplas-merkez" }, now).map((assignment) => assignment.id)).toEqual(["active"])
  })

  it("applies company, facility, active-state and date filters to Fleet chart markers", () => {
    const assignments = [
      { id: "in-scope", companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-merkez", facilityName: "Merkez Tesis", plannedStart: "2026-08-10T09:00:00+03:00", plannedEnd: "2026-08-10T10:00:00+03:00", purpose: "Kapsam içi", vehicleResourceId: "vehicle", vehicleName: "Transit", vehicleLicensePlate: "16 BPL 101", driverResourceId: "driver", driverName: "Ayşe Demir", status: "ACTIVE" as const, createdAt: "2026-08-10T08:00:00+03:00" },
      { id: "other-facility", companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-arge", facilityName: "Ar-Ge Merkezi", plannedStart: "2026-08-10T09:00:00+03:00", plannedEnd: "2026-08-10T10:00:00+03:00", purpose: "Başka tesis", vehicleResourceId: "vehicle-2", vehicleName: "Megane", vehicleLicensePlate: "16 BPL 202", driverResourceId: "driver-2", driverName: "Mehmet Kaya", status: "ACTIVE" as const, createdAt: "2026-08-10T08:00:00+03:00" },
      { id: "cancelled", companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-merkez", facilityName: "Merkez Tesis", plannedStart: "2026-08-10T09:00:00+03:00", plannedEnd: "2026-08-10T10:00:00+03:00", purpose: "İptal", vehicleResourceId: "vehicle", vehicleName: "Transit", vehicleLicensePlate: "16 BPL 101", driverResourceId: "driver", driverName: "Ayşe Demir", status: "CANCELLED" as const, createdAt: "2026-08-10T08:00:00+03:00" },
      { id: "other-day", companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-merkez", facilityName: "Merkez Tesis", plannedStart: "2026-08-11T09:00:00+03:00", plannedEnd: "2026-08-11T10:00:00+03:00", purpose: "Başka gün", vehicleResourceId: "vehicle", vehicleName: "Transit", vehicleLicensePlate: "16 BPL 101", driverResourceId: "driver", driverName: "Ayşe Demir", status: "ACTIVE" as const, createdAt: "2026-08-10T08:00:00+03:00" },
    ]

    const scoped = getTodayScopedTransportAssignments(assignments, { companyId: "bplas", facilityId: "bplas-merkez" }, now)
    expect(scoped.map((assignment) => assignment.id)).toEqual(["in-scope"])
    expect(getOperationBins([], [], scoped).find((bin) => bin.hour === 9)?.transportAssignments.map((assignment) => assignment.id)).toEqual(["in-scope"])
  })

  it("derives exclusive live dashboard statuses without showing NO_SHOW", () => {
    const dashboardVisits = [
      makeVisit("Beklenen", "PLANNED", "2026-08-10T13:00:00+03:00"),
      makeVisit("Gecikti", "PLANNED", "2026-08-10T10:00:00+03:00"),
      makeVisit("İçeride", "CHECKED_IN", "2026-08-10T11:00:00+03:00", { actualCheckIn: "2026-08-10T11:05:00+03:00", plannedEnd: "2026-08-10T13:00:00+03:00" }),
      makeVisit("Süre Aşımı", "CHECKED_IN", "2026-08-10T09:00:00+03:00", { actualCheckIn: "2026-08-10T09:05:00+03:00", plannedEnd: "2026-08-10T11:00:00+03:00" }),
      makeVisit("Tamamlandı", "CHECKED_OUT", "2026-08-10T09:00:00+03:00"),
      makeVisit("İptal", "CANCELLED", "2026-08-10T09:00:00+03:00"),
      makeVisit("Gelmedi", "NO_SHOW", "2026-08-10T09:00:00+03:00"),
    ]
    const counts = getStatusCounts(dashboardVisits, now, 0)

    expect(getDashboardVisitStatus(dashboardVisits[3], now, 0)).toBe("OVERDUE")
    expect(getDashboardVisitStatus(dashboardVisits[6], now, 0)).toBeNull()
    expect(counts).toEqual([
      { status: "PLANNED", value: 1 },
      { status: "LATE", value: 1 },
      { status: "CHECKED_IN", value: 1 },
      { status: "OVERDUE", value: 1 },
      { status: "CHECKED_OUT", value: 1 },
      { status: "CANCELLED", value: 1 },
    ])
    expect(counts.reduce((sum, count) => sum + count.value, 0)).toBe(6)
    expect(getDelayMinutes(visits[1], now)).toBe(45)
  })

  it("combines active tab, search and facility funnel filters", () => {
    expect(getOtherVisits(getTodayVisits(visits, now), { tab: "planned", search: "ayça", status: "PLANNED", facilityId: "bplas-merkez" }).map((visit) => visit.id)).toEqual(["Ayça"])
    expect(getOtherVisits(getTodayVisits(visits, now), { tab: "completed", search: "", status: "ALL", facilityId: "bplas-arge" }).map((visit) => visit.id)).toEqual(["Derya"])
  })

  it("keeps only future planned visits, sorts them and applies the limit", () => {
    const planned = [
      makeVisit("Geç", "PLANNED", "2026-08-10T09:00:00+03:00"),
      makeVisit("Şimdi", "PLANNED", "2026-08-10T12:15:00+03:00"),
      makeVisit("Tamamlandı", "CHECKED_OUT", "2026-08-10T12:30:00+03:00"),
      makeVisit("Sıradaki", "PLANNED", "2026-08-10T13:00:00+03:00"),
      makeVisit("Sonra", "PLANNED", "2026-08-10T15:00:00+03:00"),
    ]
    expect(getNextPlannedVisits(planned, now, 2).map((visit) => visit.id)).toEqual(["Sıradaki", "Sonra"])
  })

  it("returns an empty next-visit list when no visit starts after now", () => {
    expect(getNextPlannedVisits([
      makeVisit("Geç", "PLANNED", "2026-08-10T09:00:00+03:00"),
      makeVisit("Şimdi", "PLANNED", "2026-08-10T12:15:00+03:00"),
    ], now)).toEqual([])
  })
})

describe("overdue tolerance", () => {
  const now = new Date("2026-08-10T12:15:00+03:00")
  // Checked in, planned to end 15 minutes before `now`, still on site.
  const checkedIn = makeVisit("Tolerans", "CHECKED_IN", "2026-08-10T10:00:00+03:00", {
    actualCheckIn: "2026-08-10T10:05:00+03:00",
    plannedEnd: "2026-08-10T12:00:00+03:00",
  })

  it("treats the visit as overdue only once `now` passes plannedEnd + tolerance", () => {
    expect(isVisitOverdue(checkedIn, now, 16)).toBe(false) // threshold 12:16 — not reached
    expect(isVisitOverdue(checkedIn, now, 15)).toBe(false) // threshold 12:15 — exactly now, not yet overdue
    expect(isVisitOverdue(checkedIn, now, 14)).toBe(true) // threshold 12:14 — passed
  })

  it("never marks a visitor who has already checked out as overdue", () => {
    expect(isVisitOverdue({ ...checkedIn, actualCheckOut: "2026-08-10T12:05:00+03:00" }, now, 0)).toBe(false)
  })

  it("never marks a visit that is not CHECKED_IN as overdue", () => {
    expect(isVisitOverdue({ ...checkedIn, status: "PLANNED" }, now, 0)).toBe(false)
    expect(isVisitOverdue({ ...checkedIn, status: "CHECKED_OUT" }, now, 0)).toBe(false)
    expect(isVisitOverdue({ ...checkedIn, status: "NO_SHOW" }, now, 0)).toBe(false)
  })

  it("flips getDashboardVisitStatus between OVERDUE and CHECKED_IN with the same visit and `now`", () => {
    expect(getDashboardVisitStatus(checkedIn, now, 0)).toBe("OVERDUE")
    expect(getDashboardVisitStatus(checkedIn, now, 60)).toBe("CHECKED_IN")
  })

  it("shifts getStatusCounts between OVERDUE and CHECKED_IN as the tolerance widens", () => {
    const visits = [
      checkedIn,
      makeVisit("İçeride", "CHECKED_IN", "2026-08-10T11:00:00+03:00", { actualCheckIn: "2026-08-10T11:05:00+03:00", plannedEnd: "2026-08-10T13:00:00+03:00" }),
    ]
    const strict = getStatusCounts(visits, now, 0)
    const lenient = getStatusCounts(visits, now, 120)
    expect(strict.find((count) => count.status === "OVERDUE")?.value).toBe(1)
    expect(strict.find((count) => count.status === "CHECKED_IN")?.value).toBe(1)
    expect(lenient.find((count) => count.status === "OVERDUE")?.value).toBe(0)
    expect(lenient.find((count) => count.status === "CHECKED_IN")?.value).toBe(2)
  })
})
