import { afterEach, describe, expect, it, vi } from "vitest"

import type { VisitInput } from "@/domain/visits"
import { MockVisitService } from "@/services/mock-visit-service"

const visitInput: VisitInput = {
  visitorFirstName: "Test",
  visitorLastName: "Ziyaretci",
  visitorEmail: "test@example.com",
  visitTypeId: "meeting",
  hostEmployeeId: "maya-kara",
  hostCompanyId: "bplas",
  facilityId: "bplas-merkez",
  plannedStart: "2026-08-12T09:00:00.000Z",
  plannedEnd: "2026-08-12T10:00:00.000Z",
}

afterEach(() => vi.useRealTimers())

describe("MockVisitService", () => {
  it("creates, updates, reschedules, and cancels a visit without deleting it", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-10T08:00:00.000Z"))
    const service = new MockVisitService()

    const created = await service.createVisit(visitInput)
    expect(created.status).toBe("PLANNED")

    const updated = await service.updateVisit(created.id, { ...visitInput, visitorFirstName: "Guncel" })
    expect(updated.visitor.firstName).toBe("Guncel")

    const rescheduled = await service.rescheduleVisit(created.id, {
      plannedStart: "2026-08-13T11:00:00.000Z",
      plannedEnd: "2026-08-13T12:00:00.000Z",
    })
    expect(rescheduled.plannedStart).toBe("2026-08-13T11:00:00.000Z")

    const cancelled = await service.cancelVisit(created.id)
    const visits = await service.listVisits()

    expect(cancelled.status).toBe("CANCELLED")
    expect(visits).toContainEqual(expect.objectContaining({ id: created.id, status: "CANCELLED" }))
  })
})
