import { describe, expect, it } from "vitest"

import type { GoodsMovement } from "@/domain/goods-movements"
import { getGoodsPageCount, getVisibleGoodsPageNumbers, GOODS_PAGE_SIZE, paginateGoodsMovements, sortGoodsMovements, toggleGoodsSort, type Sort } from "./goods-movement-sorting"

function movement(id: string, counterpartyName: string, goodsDescription: string): GoodsMovement {
  return {
    id,
    direction: "INBOUND",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    counterpartyName,
    plannedDate: "2026-08-14",
    goodsDescription,
    status: "PLANNED",
    createdAt: "2026-08-14T08:00:00+03:00",
  }
}

describe("goods movement sorting", () => {
  it("cycles each column through asc, desc and removed without clearing other sorts", () => {
    let sorts: Sort[] = [{ field: "plannedAt", direction: "asc" }]

    sorts = toggleGoodsSort(sorts, "counterparty")
    expect(sorts).toEqual([
      { field: "plannedAt", direction: "asc" },
      { field: "counterparty", direction: "asc" },
    ])

    sorts = toggleGoodsSort(sorts, "counterparty")
    expect(sorts[1]).toEqual({ field: "counterparty", direction: "desc" })

    sorts = toggleGoodsSort(sorts, "counterparty")
    expect(sorts).toEqual([{ field: "plannedAt", direction: "asc" }])
  })

  it("sorts counterparty names with Turkish and numeric collation", () => {
    const movements = [
      movement("firma-10", "Firma 10", "Parça"),
      movement("umit", "Ümit", "Parça"),
      movement("isik", "Işık", "Parça"),
      movement("inci", "İnci", "Parça"),
      movement("firma-2", "Firma 2", "Parça"),
      movement("cinar", "Çınar", "Parça"),
      movement("safak", "Şafak", "Parça"),
    ]

    expect(sortGoodsMovements(movements, [{ field: "counterparty", direction: "asc" }]).map((item) => item.id)).toEqual([
      "cinar", "firma-2", "firma-10", "isik", "inci", "safak", "umit",
    ])
  })

  it("uses later active sorts to group equal counterparty and goods values", () => {
    const movements = [
      movement("bearing-10", "İPEK", "Rulman 10"),
      movement("valve", "Anadolu", "Vana"),
      movement("bearing-2", "ipek", "Rulman 2"),
      movement("hose", "İpek", "Hortum"),
    ]

    expect(sortGoodsMovements(movements, [
      { field: "counterparty", direction: "asc" },
      { field: "goods", direction: "asc" },
    ]).map((item) => item.id)).toEqual(["valve", "hose", "bearing-2", "bearing-10"])
  })

  it("paginates nine movements and keeps compact page controls", () => {
    const movements = Array.from({ length: 21 }, (_, index) => movement(`movement-${index}`, `Firma ${index}`, "Parça"))

    expect(GOODS_PAGE_SIZE).toBe(9)
    expect(getGoodsPageCount(movements.length)).toBe(3)
    expect(paginateGoodsMovements(movements, 1)).toHaveLength(9)
    expect(paginateGoodsMovements(movements, 3).map((item) => item.id)).toEqual(["movement-18", "movement-19", "movement-20"])
    expect(getVisibleGoodsPageNumbers(3, 5)).toEqual([2, 3, 4])
  })
})
