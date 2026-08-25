import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const tabSource = readFileSync(resolve(process.cwd(), "src/features/reports/VisitsReportTab.tsx"), "utf8")
const pageSource = readFileSync(resolve(process.cwd(), "src/features/reports/ReportsPage.tsx"), "utf8")
const chartSource = readFileSync(resolve(process.cwd(), "src/features/reports/VisitsTrendChart.tsx"), "utf8")
const reportUtilsSource = readFileSync(resolve(process.cwd(), "src/features/reports/visits-report-utils.ts"), "utf8")
const upcomingSource = readFileSync(resolve(process.cwd(), "src/features/visits/UpcomingVisits.tsx"), "utf8")
const allVisitsSource = readFileSync(resolve(process.cwd(), "src/features/manager/AllVisitsPage.tsx"), "utf8")
const goodsSource = readFileSync(resolve(process.cwd(), "src/features/goods/GoodsMovementsPage.tsx"), "utf8")

describe("Visits report UI contracts", () => {
  it("uses the same selected granularity for current and previous comparison periods", () => {
    expect(tabSource).toContain("calculateVisitsReportTrendWithStatus(reportVisits, filters, trendGranularity)")
    expect(tabSource).toContain("calculateVisitsReportTrendWithStatus(previousReportVisits, previousFilters, trendGranularity)")
  })

  it("keeps workspace and records page in URL-backed report state", () => {
    expect(pageSource).toContain("workspaceMode={queryState.view}")
    expect(pageSource).toContain("recordsPage={queryState.page}")
    expect(pageSource).toContain("onRecordsPageChange={(page) => setSearchParams(setReportsPage(searchParams, page))}")
    expect(pageSource).toContain("setReportsView(searchParams, value)")
    expect(pageSource).toContain("onClick={() => onChange(targetMode)}")
    expect(pageSource).toContain('recordsMode ? "Analize dön" : "Kayıtlar"')
    expect(tabSource).not.toContain("useState(1)")
  })

  it("uses a fixed nine-row records page without dynamic viewport sizing", () => {
    expect(reportUtilsSource).toContain("VISITS_REPORT_PAGE_SIZE = 9")
    expect(tabSource).not.toContain("ResizeObserver")
    expect(tabSource).not.toContain("RECORD_ROW_HEIGHT_PX")
    expect(tabSource).not.toContain("recordsPageSize")
    expect(tabSource).toContain("normalizedRecordsPage")
    expect(tabSource).toContain('className="w-full min-w-[980px] table-fixed text-left text-xs"')
    expect(tabSource).not.toContain('className="h-full w-full min-w-[980px]')
  })

  it("starts the records card directly with the table header and avoids a duplicate divider above pagination", () => {
    const tableHeaderIndex = tabSource.indexOf("<thead")
    const tableHeaderEndIndex = tabSource.indexOf("</thead>")
    expect(tabSource).not.toContain('className="flex h-8 shrink-0 items-center justify-end border-b px-2"')
    expect(tabSource.slice(tableHeaderIndex, tableHeaderEndIndex)).not.toContain("Analize dön")
    expect(tabSource).toContain('className="record-row-hover h-[3.125rem] cursor-pointer border-b transition-colors hover:bg-slate-50')
    expect(tabSource).not.toContain("last:border-b-0")
    expect(tabSource).toContain("ziyaret detaylarını görüntüle")
    expect(tabSource).toContain("<VisitDetailsDialog")
  })

  it("shows comparison in both analysis workspaces and granularity only for visit analysis", () => {
    expect(pageSource).toContain('queryState.tab === "visits"')
    expect(pageSource).toContain('queryState.tab === "vehicle" && fleetWorkspace.view === "analysis"')
    expect(pageSource).toContain('queryState.view === "analysis" && !isTodayRange')
    expect(pageSource).toContain("<ComparisonFilter value={queryState.comparison}")
    expect(pageSource).toContain("<GranularitySelect value={queryState.granularity}")
    expect(pageSource).toContain("<ReportWorkspaceSwitch mode={queryState.view}")
    expect(tabSource).not.toContain("GranularitySelect")
    expect(tabSource).not.toContain("WorkspaceNavigationAction")
  })

  it("renders analysis metadata beside the title with neutral secondary deltas", () => {
    const headerStart = tabSource.indexOf('id="visits-analysis-title"')
    const chartStart = tabSource.indexOf('className="mt-2 min-h-0 flex-1"')
    const headerSource = tabSource.slice(headerStart, chartStart)
    expect(headerSource).toContain('aria-label="Ziyaret analiz metrikleri"')
    expect(headerSource).toContain('className="ml-auto flex min-w-0 flex-wrap justify-end')
    expect(tabSource).toContain('text-[10px] font-normal text-slate-400')
    expect(tabSource).not.toContain("delta.percent")
  })

  it("applies the same shared sizing helper to every chart and every stacked bar", () => {
    expect(chartSource).toContain("getVisitsTrendBarSizing(points.length)")
    expect(chartSource.match(/maxBarSize=\{barSizing\.maxBarSize\}/g)).toHaveLength(5)
    expect(chartSource.match(/barSize=\{barSizing\.maxBarSize\}/g)).toHaveLength(4)
    expect(tabSource).toContain("<VisitsTrendChart points={points}")
  })

  it("adds partial weekly context only inside the shared tooltip", () => {
    expect(chartSource).toContain("getVisitsTrendTooltipPeriodContext(point)")
    expect(chartSource).toContain("periodContext")
    expect(reportUtilsSource).toContain("periodDayCount >= 7")
  })

  it("removes duplicate date and record-count headings from both workspaces", () => {
    expect(tabSource).not.toContain('<p className="mt-0.5 text-[11px] text-slate-500">{formatRangeLabel(filters)}</p>')
    expect(tabSource).not.toContain("· {reportVisits.length} kayıt")
    expect(tabSource).not.toContain("Kayıtları gör")
    expect(tabSource).not.toContain("Analize dön")
  })

  it("uses Gerçekleşmedi consistently and removes Gelişmedi from report presentation", () => {
    expect(reportUtilsSource).toContain('NO_SHOW: "Gerçekleşmedi"')
    expect(`${tabSource}${chartSource}${reportUtilsSource}`).not.toContain("Gelişmedi")
  })

  it("keeps a separator beneath every upcoming visit row, including the last one", () => {
    expect(upcomingSource).toContain('className="min-h-0 flex-1 overflow-y-auto scrollbar-thin"')
    expect(upcomingSource).toContain('className="group block w-full border-b border-slate-200')
  })

  it("does not render unfinished saved-report and create-report controls", () => {
    expect(pageSource).not.toContain("Kaydedilmiş Raporlar")
    expect(pageSource).not.toContain("Rapor Oluştur")
  })

  it("uses the concise search placeholders without changing the established filters", () => {
    expect(allVisitsSource).toContain('placeholder="Ziyaretçi veya şirket ara"')
    expect(goodsSource).toContain('placeholder="Mal veya karşı firma ara"')
  })

  it("keeps the report toolbar's action group at the right and preserves an empty second line slot", () => {
    expect(pageSource).toContain('className={cn("ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2", recordsMode && "lg:flex-nowrap")}')
    expect(pageSource).toContain("Rapor filtreleri")
    expect(pageSource).toContain('className={cn("h-5 shrink-0 gap-1 border-none px-1')
    expect(pageSource).toContain('!hasActiveReportFilters && "invisible"')
    expect(pageSource).toContain("resetReportsFilters(searchParams)")
    expect(pageSource).toContain("useFillViewportHeight(14")
    expect(tabSource).toContain('className="block h-3" />')
    expect(tabSource).not.toContain("&nbsp;")
  })
})
