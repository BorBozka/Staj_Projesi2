import { AlertCircle, ArrowLeftRight, Building2, ChartBar, ChevronDown, FilterX, List } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { QuickDateRangeSelect } from "@/components/common/QuickDateRangeSelect"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { isDateRangeInvalid } from "@/features/manager/all-visits-utils"
import { FleetReportTab } from "@/features/reports/FleetReportTab"
import { parseFleetReportWorkspace, setFleetReportWorkspace } from "@/features/reports/fleet-report-utils"
import { GoodsReportTab } from "@/features/reports/GoodsReportTab"
import { parseGoodsReportWorkspace, setGoodsReportWorkspace } from "@/features/reports/goods-report-utils"
import {
  getDefaultReportsRange,
  getComparisonPeriod,
  resetReportsFilters,
  saveReportsSearch,
  setReportsComparison,
  setReportsCustomComparison,
  setReportsGranularity,
  setReportsPage,
  getMaxEndDate,
  getQuickRangeOptions,
  parseReportsQuery,
  reportTabs,
  setReportsRange,
  setReportsTab,
  setReportsView,
  updateReportsSearchParams,
  type ReportComparisonMode,
  type ReportGranularity,
  type ReportTab,
  type ReportView,
  type ReportsScopeFilters,
} from "@/features/reports/reports-filters"
import {
  VisitsReportTab,
} from "@/features/reports/VisitsReportTab"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"
import { useFillViewportHeight } from "@/lib/use-fill-viewport-height"
import { cn } from "@/lib/utils"

const tabLabels: Record<ReportTab, string> = {
  visits: "Ziyaretler",
  vehicle: "Araç / Şoför",
  goods: "Mal Hareketi",
}

const enabledTabs = new Set<ReportTab>(["visits", "vehicle", "goods"])

const comparisonOptions: { value: ReportComparisonMode; label: string }[] = [
  { value: "none", label: "Karşılaştırma yok" },
  { value: "previous", label: "Önceki dönem" },
  { value: "previous-year", label: "Geçen yıl aynı dönem" },
  { value: "custom", label: "Özel dönem" },
]

export function ReportsPage() {
  const { meetings, visits, referenceData, isLoading, error, reload } = useVisits()
  const [searchParams, setSearchParams] = useSearchParams()
  const [now] = useState(() => new Date())

  const queryState = useMemo(
    () => referenceData ? parseReportsQuery(searchParams, referenceData, now) : null,
    [referenceData, searchParams, now],
  )
  const filters = queryState?.filters
  const fleetWorkspace = useMemo(() => parseFleetReportWorkspace(searchParams), [searchParams])
  const goodsWorkspace = useMemo(() => parseGoodsReportWorkspace(searchParams), [searchParams])

  useEffect(() => {
    saveReportsSearch(searchParams)
  }, [searchParams])

  // Each tab parses its own workspace keys. This lets view and pagination choices survive a
  // tab switch without one report accidentally treating another report's state as its own.
  const { ref: workspacePanelRef, height: workspacePanelHeight } = useFillViewportHeight(14, [queryState?.comparison, queryState?.tab, queryState?.view, fleetWorkspace.view, goodsWorkspace.view])

  if (isLoading) return <ReportsSkeleton />

  if (error || !referenceData || !filters || !queryState) {
    return (
      <section className="rounded-lg border border-red-200 bg-white px-5 py-12 text-center shadow-panel" role="alert">
        <AlertCircle className="mx-auto size-8 text-red-600" />
        <h1 className="mt-3 text-base font-semibold text-slate-900">Raporlar yüklenemedi</h1>
        <p className="mt-1 text-sm text-slate-600">{error ?? "Referans verileri alınamadı."}</p>
        <Button className="mt-4" onClick={() => void reload()}>Tekrar dene</Button>
      </section>
    )
  }

  const facilities = referenceData.facilities.filter((facility) => filters.companyId === "all" || facility.companyId === filters.companyId)
  const dateRangeInvalid = isDateRangeInvalid(filters)
  const defaultRange = getDefaultReportsRange(now)
  const hasActiveReportFilters = filters.startDate !== defaultRange.startDate
    || filters.endDate !== defaultRange.endDate
    || filters.companyId !== "all"
    || filters.facilityId !== "all"
    || queryState.comparison !== "none"
    || queryState.granularity !== "daily"
  const quickRanges = getQuickRangeOptions(now)
  const maxEndDate = getMaxEndDate(now)
  const comparisonPeriod = getComparisonPeriod(filters, queryState.comparison, searchParams.get("compareFrom"))
  const comparisonFilters = comparisonPeriod ? { ...filters, ...comparisonPeriod } : null
  const comparisonLabel = comparisonOptions.find((item) => item.value === queryState.comparison)?.label ?? "Önceki dönem"

  const setFilter = (key: string, value: string) => {
    setSearchParams(updateReportsSearchParams(searchParams, key, value))
  }

  const setRange = (startDate: string, endDate: string) => {
    setSearchParams(setReportsRange(searchParams, startDate, endDate))
  }

  const resetToDefault = () => {
    setSearchParams(resetReportsFilters(searchParams))
  }

  const selectTab = (tab: ReportTab) => {
    if (!enabledTabs.has(tab)) return
    setSearchParams(setReportsTab(searchParams, tab))
  }

  const isTodayRange = filters.startDate !== "" && filters.startDate === filters.endDate && filters.endDate === formatTr(now, "yyyy-MM-dd")

  return (
    <div className="min-w-0 space-y-3 md:space-y-3.5">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b pb-1.5">
        <nav className="flex items-center gap-1" aria-label="Rapor sekmeleri" role="tablist">
          {reportTabs.map((tab) => {
            const enabled = enabledTabs.has(tab)
            const active = queryState.tab === tab
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                aria-disabled={!enabled}
                disabled={!enabled}
                tabIndex={enabled ? 0 : -1}
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                  active && enabled
                    ? "border-blue-600 text-blue-700"
                    : enabled
                      ? "border-transparent text-slate-600 hover:text-slate-900"
                      : "border-transparent text-slate-400",
                )}
                onClick={() => selectTab(tab)}
              >
                {tabLabels[tab]}
              </button>
            )
          })}
        </nav>

      </div>

      <section className="rounded-lg border bg-card px-3 py-2 shadow-panel" aria-label="Rapor bağlamı">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rapor filtreleri</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-5 shrink-0 gap-1 border-none px-1 text-[11px] font-medium text-slate-500 shadow-none hover:bg-transparent hover:text-slate-900", !hasActiveReportFilters && "invisible")}
            onClick={resetToDefault}
          >
            <FilterX className="size-3 text-slate-500" />
            Varsayılana sıfırla
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <label htmlFor="reports-from" className="sr-only">Başlangıç tarihi</label>
            <Input id="reports-from" type="date" value={filters.startDate} aria-invalid={dateRangeInvalid} onChange={(event) => setFilter("from", event.target.value)} className="h-8 w-[8.75rem] text-xs" />
            <span className="text-xs text-slate-400" aria-hidden="true">–</span>
            <label htmlFor="reports-to" className="sr-only">Bitiş tarihi</label>
            <Input id="reports-to" type="date" value={filters.endDate} max={maxEndDate} aria-invalid={dateRangeInvalid} onChange={(event) => setFilter("to", event.target.value)} className="h-8 w-[8.75rem] text-xs" />
            </div>

            <div className="w-[8.5rem] shrink-0">
              <QuickDateRangeSelect options={quickRanges} startDate={filters.startDate} endDate={filters.endDate} onSelect={setRange} ariaLabel="Hızlı tarih aralığı" />
            </div>

            <div className="min-w-[12rem] flex-1">
              <ScopeFilter filters={filters} companyOptions={referenceData.companies} facilityOptions={facilities} onSelectCompany={(value) => setFilter("company", value)} onSelectFacility={(value) => setFilter("facility", value)} />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
            {((queryState.tab === "visits" && queryState.view === "analysis") || (queryState.tab === "vehicle" && fleetWorkspace.view === "analysis") || (queryState.tab === "goods" && goodsWorkspace.view === "analysis")) && (
              <ComparisonFilter value={queryState.comparison} filters={filters} customStart={searchParams.get("compareFrom") ?? ""} onChange={(value) => setSearchParams(setReportsComparison(searchParams, value))} onCustomStart={(value) => setSearchParams(setReportsCustomComparison(searchParams, filters, value))} />
            )}
            {queryState.tab === "visits" && queryState.view === "analysis" && !isTodayRange && (
              <GranularitySelect value={queryState.granularity} onChange={(value) => setSearchParams(setReportsGranularity(searchParams, value))} />
            )}
            {queryState.tab === "visits" && <ReportWorkspaceSwitch mode={queryState.view} onChange={(value) => setSearchParams(setReportsView(searchParams, value))} />}
            {queryState.tab === "vehicle" && fleetWorkspace.view === "analysis" && <FleetDimensionSwitch dimension={fleetWorkspace.dimension} onChange={(dimension) => setSearchParams(setFleetReportWorkspace(searchParams, { dimension }))} />}
            {queryState.tab === "vehicle" && <FleetWorkspaceSwitch view={fleetWorkspace.view} onChange={(view) => setSearchParams(setFleetReportWorkspace(searchParams, { view }))} />}
            {queryState.tab === "goods" && goodsWorkspace.view === "analysis" && <GranularitySelect value={queryState.granularity} onChange={(value) => setSearchParams(setReportsGranularity(searchParams, value))} />}
            {queryState.tab === "goods" && <GoodsWorkspaceSwitch view={goodsWorkspace.view} onChange={(view) => setSearchParams(setGoodsReportWorkspace(searchParams, { view }))} />}
          </div>
        </div>

        {dateRangeInvalid && <p className="mt-1.5 text-xs font-medium text-red-700" role="alert">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>}
      </section>

      {queryState.tab === "visits" || queryState.tab === "vehicle" || queryState.tab === "goods" ? (
        <div ref={workspacePanelRef} role="tabpanel" className="min-h-0 overflow-hidden" style={workspacePanelHeight !== undefined ? { height: workspacePanelHeight } : undefined}>
          {queryState.tab === "visits" ? (
            <VisitsReportTab
              visits={visits}
              filters={filters}
              dateRangeInvalid={dateRangeInvalid}
              workspaceMode={queryState.view}
              selectedGranularity={queryState.granularity}
              recordsPage={queryState.page}
              onRecordsPageChange={(page) => setSearchParams(setReportsPage(searchParams, page))}
              comparisonEnabled={comparisonFilters !== null}
              comparisonFilters={comparisonFilters}
              comparisonLabel={comparisonLabel}
            />
          ) : queryState.tab === "vehicle" ? (
            <FleetReportTab meetings={meetings} visits={visits} filters={filters} dateRangeInvalid={dateRangeInvalid} comparisonFilters={comparisonFilters} comparisonLabel={comparisonLabel} />
          ) : (
            <GoodsReportTab filters={filters} dateRangeInvalid={dateRangeInvalid} selectedGranularity={queryState.granularity} comparisonFilters={comparisonFilters} comparisonLabel={comparisonLabel} />
          )}
        </div>
      ) : null}
    </div>
  )
}

function GranularitySelect({ value, onChange }: { value: ReportGranularity; onChange(value: ReportGranularity): void }) {
  return (
    <label className="flex shrink-0 items-center">
      <span className="sr-only">Analiz ayrıntı düzeyi</span>
      <select
        value={value}
        aria-label="Analiz ayrıntı düzeyi"
        onChange={(event) => onChange(event.target.value as ReportGranularity)}
        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-none outline-none transition-colors hover:bg-slate-50 focus-visible:ring-1 focus-visible:ring-blue-300"
      >
        <option value="daily">Günlük</option>
        <option value="weekly">Haftalık</option>
      </select>
    </label>
  )
}

function ReportWorkspaceSwitch({ mode, onChange }: { mode: ReportView; onChange(mode: ReportView): void }) {
  const recordsMode = mode === "records"
  const targetMode: ReportView = recordsMode ? "analysis" : "records"

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 shrink-0 gap-1.5 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-none"
      onClick={() => onChange(targetMode)}
    >
      {recordsMode ? <ChartBar className="size-3.5" aria-hidden="true" /> : <List className="size-3.5" aria-hidden="true" />}
      {recordsMode ? "Analize dön" : "Kayıtlar"}
    </Button>
  )
}

function ComparisonFilter({ value, filters, customStart, onChange, onCustomStart }: { value: ReportComparisonMode; filters: ReportsScopeFilters; customStart: string; onChange(next: ReportComparisonMode): void; onCustomStart(value: string): void }) {
  const [open, setOpen] = useState(false)
  const [pendingCustom, setPendingCustom] = useState(false)
  const [draftCustomStart, setDraftCustomStart] = useState(customStart)
  const label = comparisonOptions.find((option) => option.value === value)?.label ?? comparisonOptions[0].label
  const customVisible = pendingCustom || value === "custom"

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      // An unfinished custom selection is intentionally local to this menu. Closing it never
      // replaces an already committed comparison period with an incomplete URL state.
      setPendingCustom(false)
      setDraftCustomStart(customStart)
    } else {
      setDraftCustomStart(customStart)
    }
  }

  const selectComparison = (next: ReportComparisonMode) => {
    if (next === "custom") {
      setPendingCustom(true)
      return
    }
    setPendingCustom(false)
    onChange(next)
    setOpen(false)
  }

  const updateCustomStart = (nextStart: string) => {
    setDraftCustomStart(nextStart)
    if (!getComparisonPeriod(filters, "custom", nextStart)) return
    setPendingCustom(false)
    onCustomStart(nextStart)
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="h-8 max-w-full justify-start gap-1.5 bg-white px-2.5 text-left text-xs font-normal text-slate-700 shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300" aria-label={`Karşılaştırma. ${label}`}>
          <ArrowLeftRight className="size-3.5 shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(15rem,calc(100vw-2rem))] p-1.5" aria-label="Karşılaştırma dönemi seç">
        <DropdownMenuLabel className="text-sm text-slate-900">Karşılaştırma</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={customVisible ? "custom" : value} onValueChange={(next) => selectComparison(next as ReportComparisonMode)}>
          {comparisonOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} onSelect={option.value === "custom" ? (event) => event.preventDefault() : undefined} className="data-[state=checked]:bg-blue-50 data-[state=checked]:font-medium data-[state=checked]:text-blue-900">{option.label}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {customVisible && <div className="mt-1 border-t px-2 pt-2"><label className="text-[11px] font-medium text-slate-600" htmlFor="comparison-custom-from">Karşılaştırma başlangıcı</label><Input id="comparison-custom-from" type="date" value={draftCustomStart} onChange={(event) => updateCustomStart(event.target.value)} className="mt-1 h-8 text-xs" /><p className="mt-1 text-[10px] text-slate-500">Bitiş, seçili dönemin uzunluğuna göre otomatik hesaplanır.</p>{!getComparisonPeriod(filters, "custom", draftCustomStart) && <p className="mt-1 text-[10px] text-amber-700">Geçerli bir başlangıç tarihi seçin.</p>}</div>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FleetDimensionSwitch({ dimension, onChange }: { dimension: "vehicles" | "drivers"; onChange(value: "vehicles" | "drivers"): void }) {
  return <div className="inline-flex h-8 rounded-md border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Planlama yükü boyutu"><button type="button" aria-pressed={dimension === "vehicles"} onClick={() => onChange("vehicles")} className={dimension === "vehicles" ? "rounded bg-white px-2 text-xs font-semibold text-blue-700 shadow-sm" : "rounded px-2 text-xs text-slate-600"}>Araçlar</button><button type="button" aria-pressed={dimension === "drivers"} onClick={() => onChange("drivers")} className={dimension === "drivers" ? "rounded bg-white px-2 text-xs font-semibold text-blue-700 shadow-sm" : "rounded px-2 text-xs text-slate-600"}>Şoförler</button></div>
}

function FleetWorkspaceSwitch({ view, onChange }: { view: "analysis" | "records"; onChange(value: "analysis" | "records"): void }) {
  const records = view === "records"
  return <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-none" onClick={() => onChange(records ? "analysis" : "records")}>{records ? <ChartBar className="size-3.5" /> : <List className="size-3.5" />}{records ? "Analize dön" : "Kayıtlar"}</Button>
}

function GoodsWorkspaceSwitch({ view, onChange }: { view: "analysis" | "records"; onChange(value: "analysis" | "records"): void }) {
  const records = view === "records"
  return <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-none" onClick={() => onChange(records ? "analysis" : "records")}>{records ? <ChartBar className="size-3.5" /> : <List className="size-3.5" />}{records ? "Analize dön" : "Kayıtlar"}</Button>
}

function ScopeFilter({ filters, companyOptions, facilityOptions, onSelectCompany, onSelectFacility }: {
  filters: ReportsScopeFilters
  companyOptions: { id: string; name: string }[]
  facilityOptions: { id: string; name: string }[]
  onSelectCompany(value: string): void
  onSelectFacility(value: string): void
}) {
  const companyName = filters.companyId === "all" ? "Tümü" : companyOptions.find((company) => company.id === filters.companyId)?.name ?? "Tümü"
  const facilityName = filters.facilityId === "all" ? "Tümü" : facilityOptions.find((facility) => facility.id === filters.facilityId)?.name ?? "Tümü"
  const summary = `Şirket: ${companyName} · Tesis: ${facilityName}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="h-8 max-w-full justify-start gap-1.5 bg-white px-2.5 text-left text-xs font-normal text-slate-700 shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300" aria-label={`Rapor kapsamı. ${summary}`}>
          <Building2 className="size-3.5 shrink-0" />
          <span className="truncate">{summary}</span>
          <ChevronDown className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(32rem,calc(100vh-2rem))] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto p-1.5" aria-label="Rapor kapsamını seç">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-sm text-slate-900">Şirket</DropdownMenuLabel>
          <button
            type="button"
            className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            onClick={() => onSelectCompany("all")}
          >
            Tüm kapsam
          </button>
        </div>
        <DropdownMenuRadioGroup value={filters.companyId} onValueChange={onSelectCompany}>
          {companyOptions.map((company) => (
            <DropdownMenuRadioItem key={company.id} value={company.id} onSelect={(event) => event.preventDefault()} className="data-[state=checked]:bg-blue-50 data-[state=checked]:font-medium data-[state=checked]:text-blue-900">{company.name}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-sm text-slate-900">Tesis</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={filters.facilityId} onValueChange={onSelectFacility}>
          {facilityOptions.map((facility) => (
            <DropdownMenuRadioItem key={facility.id} value={facility.id} onSelect={(event) => event.preventDefault()} className="data-[state=checked]:bg-blue-50 data-[state=checked]:font-medium data-[state=checked]:text-blue-900">{facility.name}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ReportsSkeleton() {
  return (
    <div className="space-y-3" aria-label="Raporlar yükleniyor" role="status">
      <div className="flex items-end justify-between gap-2 border-b pb-1.5">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-100" />
        <div className="h-8 w-56 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="rounded-lg border bg-white px-3 py-2 shadow-panel">
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-8 w-36 animate-pulse rounded bg-slate-100" />)}
        </div>
      </div>
      <div className="h-[min(34rem,calc(100vh-15rem))] animate-pulse rounded-lg border bg-white shadow-panel" />
    </div>
  )
}
