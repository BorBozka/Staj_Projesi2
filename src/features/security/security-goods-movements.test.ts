import { describe, expect, it } from "vitest"

import type { GoodsMovement } from "@/domain/goods-movements"
import { filterSecurityGoodsMovements, formatSecurityGoodsMovementPlannedAt, getSecurityScopedTodayPlannedGoodsMovements, groupSecurityGoodsMovements } from "@/features/security/security-goods-movements"

const now = new Date("2026-09-01T12:00:00")
const scope = { companyId: "company-1", facilityId: "facility-1" }

function movement(id: string, overrides: Partial<GoodsMovement> = {}): GoodsMovement {
  return {
    id,
    direction: "INBOUND",
    companyId: "company-1",
    companyName: "Şirket",
    facilityId: "facility-1",
    facilityName: "Tesis",
    counterpartyName: "Atlas Tedarik",
    plannedDate: "2026-09-01",
    goodsDescription: "Polimer granül",
    status: "PLANNED",
    createdAt: "2026-08-31T09:00:00.000Z",
    ...overrides,
  }
}

describe("Security goods movement operations", () => {
  it("formats planned timestamps with shared Turkish date formatting", () => {
    const today = movement("today", { plannedTime: "09:10" })
    expect(formatSecurityGoodsMovementPlannedAt(today, new Date(2026, 8, 1, 11, 0))).toBe("Bugün · 09:10")
    expect(formatSecurityGoodsMovementPlannedAt({ ...today, plannedDate: "2026-09-02", plannedTime: undefined }, new Date(2026, 8, 1, 11, 0))).toBe("2 Eyl 2026 · Saat belirtilmedi")
  })

  it("keeps only today's planned records in the active Security scope", () => {
    const scoped = getSecurityScopedTodayPlannedGoodsMovements([
      movement("included"),
      movement("completed", { status: "COMPLETED" }),
      movement("cancelled", { status: "CANCELLED" }),
      movement("other-facility", { facilityId: "facility-2" }),
      movement("tomorrow", { plannedDate: "2026-09-02" }),
    ], scope, now)

    expect(scoped.map((item) => item.id)).toEqual(["included"])
  })

  it("separates directions and sorts late, timed upcoming, then untimed records", () => {
    const panels = groupSecurityGoodsMovements([
      movement("incoming-late-later", { plannedTime: "10:00" }),
      movement("incoming-late-first", { plannedTime: "08:30" }),
      movement("incoming-upcoming", { plannedTime: "14:00" }),
      movement("incoming-untimed"),
      movement("outgoing", { direction: "OUTBOUND", plannedTime: "13:00" }),
    ], now)

    expect(panels.inbound.late.map((row) => row.movement.id)).toEqual(["incoming-late-first", "incoming-late-later"])
    expect(panels.inbound.upcoming.map((row) => row.movement.id)).toEqual(["incoming-upcoming", "incoming-untimed"])
    expect(panels.outbound.upcoming.map((row) => row.movement.id)).toEqual(["outgoing"])
  })

  it("searches counterparty, goods description, and reference number", () => {
    const records = [
      movement("counterparty", { counterpartyName: "Çınar Lojistik" }),
      movement("goods", { goodsDescription: "Kalıp aparatı" }),
      movement("reference", { referenceNumber: "IRS-742" }),
    ]

    expect(filterSecurityGoodsMovements(records, "çınar").map((item) => item.id)).toEqual(["counterparty"])
    expect(filterSecurityGoodsMovements(records, "aparat").map((item) => item.id)).toEqual(["goods"])
    expect(filterSecurityGoodsMovements(records, "742").map((item) => item.id)).toEqual(["reference"])
  })
})
