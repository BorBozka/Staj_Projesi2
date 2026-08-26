import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const tabSource = readFileSync(resolve(process.cwd(), "src/features/reports/GoodsReportTab.tsx"), "utf8")
const dialogSource = readFileSync(resolve(process.cwd(), "src/features/reports/GoodsMovementDetailDialog.tsx"), "utf8")
const pageSource = readFileSync(resolve(process.cwd(), "src/features/reports/ReportsPage.tsx"), "utf8")

describe("Goods report workspace UI contract", () => {
  it("uses a viewport-filling analysis and records workspace with independent URL state", () => {
    expect(pageSource).toContain("parseGoodsReportWorkspace(searchParams)")
    expect(pageSource).toContain("setGoodsReportWorkspace(searchParams, { view })")
    expect(pageSource).toContain('queryState.tab === "goods" && goodsWorkspace.view === "analysis"')
    expect(tabSource).toContain("parseGoodsReportWorkspace(searchParams)")
    expect(tabSource).toContain("setGoodsReportPage(searchParams, nextPage)")
    expect(tabSource).toContain('className="flex h-full min-h-0 flex-col overflow-hidden')
  })

  it("uses stacked inbound/outbound analysis rather than KPI cards", () => {
    expect(tabSource).toContain("<GoodsMovementTrendChart")
    expect(tabSource).toContain("buildGoodsMetadata")
    expect(tabSource).toContain("buildGoodsInsight")
    expect(tabSource).not.toContain("ReportKpiCard")
  })

  it("opens the selected record with pointer and keyboard interactions", () => {
    expect(tabSource).toContain("tabIndex={0}")
    expect(tabSource).toContain('aria-haspopup="dialog"')
    expect(tabSource).toContain("isGoodsRecordActivationKey(event.key)")
    expect(tabSource).toContain("setSelectedMovement(movement)")
    expect(tabSource).toContain("returnFocusRef={detailTriggerRef}")
  })

  it("fills the records area so the final row meets the pagination footer", () => {
    expect(tabSource).toContain('className="h-full w-full min-w-[1100px] table-fixed text-left text-xs"')
    expect(tabSource).toContain("GoodsReportFillerRow")
    expect(tabSource).toContain("border-transparent")
    expect(tabSource).toContain('h-[3.375rem] cursor-pointer border-b')
    expect(tabSource).toContain('<SortableHeader className="w-[9%]" label="Yön"')
    expect(tabSource).toContain('h-[3.375rem] cursor-pointer border-b last:border-b-0 transition-colors')
    expect(tabSource).toContain("last:border-b-0")
  })

  it("waits for movements before normalizing a restored records page", () => {
    expect(tabSource).toContain('workspace.view !== "records" || !movementsLoaded')
  })
})

describe("Goods movement report detail dialog contract", () => {
  it("is read-only and shows only values present in the domain model", () => {
    expect(dialogSource).toContain("Mal Hareketi Detayı")
    for (const label of ["Yön", "Durum", "Şirket", "Tesis", "Karşı taraf", "Planlanan tarih", "Planlanan saat", "Gerçekleşen zaman", "Referans no", "Gerçekleşen plaka", "Gerçekleşen şoför"]) expect(dialogSource).toContain(label)
    for (const action of ["Düzenle", "Kaydet", "İptal et", "Tamamla"]) expect(dialogSource).not.toContain(action)
    expect(dialogSource).toContain("onCloseAutoFocus")
    expect(dialogSource).toContain("returnFocusRef.current?.focus()")
  })
})
