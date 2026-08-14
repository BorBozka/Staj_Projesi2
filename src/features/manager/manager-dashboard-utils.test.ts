import { describe, expect, it } from "vitest"

import type { ExpectedAfterHoursDelivery } from "@/domain/manager-dashboard"
import type { Visit, VisitStatus } from "@/domain/visits"
import { getActiveTransportAssignments, getDashboardVisitStatus, getDelayMinutes, getNextPlannedVisits, getOperationBins, getOtherVisits, getScopedVisits, getStatusCounts, getTodayScopedTransportAssignments, getTodayVisits } from "./manager-dashboard-utils"

function makeVisit(id: string, status: VisitStatus, plannedStart: string, overrides: Partial<Visit> = {}): Visit {
  return {
    id,
    meetingId: `meeting-${id}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: `visitor-${id}`, firstName: id, lastName: "Ziyaretçi", email: `${id}@example.com` },
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
    const deliveries: ExpectedAfterHoursDelivery[] = [
      { id: "delivery-1", supplierName: "Tedarikçi", companyId: "bplas", facilityId: "bplas-merkez", expectedAt: "2026-08-10T19:00:00+03:00", status: "EXPECTED" },
      { id: "delivery-2", supplierName: "Gece Tedarikçisi", companyId: "bplas", facilityId: "bplas-merkez", expectedAt: "2026-08-10T23:30:00+03:00", status: "EXPECTED" },
    ]
    const assignments = [{
      id: "transport-1", companyId: "bplas", companyName: "BPLAS A.Ş.", facilityId: "bplas-merkez", facilityName: "Merkez Tesis", plannedStart: "2026-08-10T19:00:00+03:00", plannedEnd: "2026-08-10T20:00:00+03:00", purpose: "Saha görevi", vehicleResourceId: "vehicle-1", vehicleName: "Transit", vehicleLicensePlate: "16 BPL 101", driverResourceId: "driver-1", driverName: "Ayşe Demir", status: "ACTIVE" as const, createdAt: "2026-08-10T08:00:00+03:00",
    }]
    const bins = getOperationBins(getTodayVisits(visits, now), deliveries, assignments)

    expect(bins.find((bin) => bin.hour === 10)).toMatchObject({ planned: 2, actual: 1 })
    expect(bins.find((bin) => bin.hour === 19)?.deliveries).toHaveLength(1)
    expect(bins.find((bin) => bin.hour === 23)?.deliveries).toHaveLength(1)
    expect(bins.find((bin) => bin.hour === 19)?.transportAssignments).toHaveLength(1)
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
    const counts = getStatusCounts(dashboardVisits, now)

    expect(getDashboardVisitStatus(dashboardVisits[3], now)).toBe("OVERDUE")
    expect(getDashboardVisitStatus(dashboardVisits[6], now)).toBeNull()
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
