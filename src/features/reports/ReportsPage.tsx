import { AlertCircle, ArrowLeftRight, Bookmark, Building2, ChevronDown, FilterX, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
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
import { GoodsReportTab } from "@/features/reports/GoodsReportTab"
import {
  getDefaultReportsRange,
  getMaxEndDate,
  getQuickRangeOptions,
  matchesQuickRange,
  parseReportsQuery,
  reportTabs,
  setReportsRange,
  setReportsTab,
  updateReportsSearchParams,
  type ReportTab,
  type ReportsScopeFilters,
} from "@/features/reports/reports-filters"
import { VisitsReportTab } from "@/features/reports/VisitsReportTab"
import { useVisits } from "@/features/visits/visit-context"
import { useFillViewportHeight } from "@/lib/use-fill-viewport-height"
import { cn } from "@/lib/utils"

const tabLabels: Record<ReportTab, string> = {
  visits: "Ziyaretler",
  vehicle: "Araç / Şoför",
  goods: "Mal Hareketi",
}

const enabledTabs = new Set<ReportTab>(["visits", "vehicle", "goods"])

type ComparisonMode = "none" | "previous"

const comparisonOptions: { value: ComparisonMode; label: string }[] = [
  { value: "none", label: "Karşılaştırma yok" },
  { value: "previous", label: "Önceki dönem" },
]

export function ReportsPage() {
  const { meetings, visits, referenceData, isLoading, error, reload } = useVisits()
  const [searchParams, setSearchParams] = useSearchParams()
  const [now] = useState(() => new Date())
  const [comparison, setComparison] = useState<ComparisonMode>("none")

  const queryState = useMemo(
    () => referenceData ? parseReportsQuery(searchParams, referenceData, now) : null,
    [referenceData, searchParams, now],
  )
  const filters = queryState?.filters

  // Only the Visits tab's two-card layout (Ana Analiz / Ziyaret Kayıtları) needs to fit the
  // remaining viewport without page scroll; Fleet and Goods tabs keep their normal page flow.
  const { ref: visitsPanelRef, height: visitsPanelHeight } = useFillViewportHeight(16, [comparison, queryState?.tab])

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
  const isDefaultState = filters.startDate === defaultRange.startDate
    && filters.endDate === defaultRange.endDate
    && filters.companyId === "all"
    && filters.facilityId === "all"
  const quickRanges = getQuickRangeOptions(now)
  const maxEndDate = getMaxEndDate(now)

  const setFilter = (key: string, value: string) => {
    setSearchParams(updateReportsSearchParams(searchParams, key, value))
  }

  const setRange = (startDate: string, endDate: string) => {
    setSearchParams(setReportsRange(searchParams, startDate, endDate))
  }

  const resetToDefault = () => {
    const next = new URLSearchParams(searchParams)
    next.delete("from")
    next.delete("to")
    next.delete("company")
    next.delete("facility")
    next.delete("page")
    setSearchParams(next)
  }

  const selectTab = (tab: ReportTab) => {
    if (!enabledTabs.has(tab)) return
    setSearchParams(setReportsTab(searchParams, tab))
  }

  return (
    <div className="min-w-0 space-y-3">
      <h1 className="sr-only">Raporlar</h1>

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

        <div className="flex items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled title="Yakında eklenecek">
            <Bookmark className="size-3.5" />Kaydedilmiş Raporlar
          </Button>
          <Button type="button" size="sm" className="h-8 gap-1.5 text-xs" disabled title="Yakında eklenecek">
            <Plus className="size-3.5" />Rapor Oluştur
          </Button>
        </div>
      </div>

      <section className="rounded-lg border bg-card px-3 py-2 shadow-panel" aria-label="Rapor bağlamı">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <label htmlFor="reports-from" className="sr-only">Başlangıç tarihi</label>
            <Input id="reports-from" type="date" value={filters.startDate} aria-invalid={dateRangeInvalid} onChange={(event) => setFilter("from", event.target.value)} className="h-8 w-[9.25rem] text-xs" />
            <span className="text-xs text-slate-400" aria-hidden="true">–</span>
            <label htmlFor="reports-to" className="sr-only">Bitiş tarihi</label>
            <Input id="reports-to" type="date" value={filters.endDate} max={maxEndDate} aria-invalid={dateRangeInvalid} onChange={(event) => setFilter("to", event.target.value)} className="h-8 w-[9.25rem] text-xs" />
          </div>

          <span className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Hızlı tarih aralığı seçimi">
            {quickRanges.map((option) => {
              const active = matchesQuickRange(filters, option)
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  onClick={() => setRange(option.startDate, option.endDate)}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <span className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

          <ScopeFilter filters={filters} companyOptions={referenceData.companies} facilityOptions={facilities} onSelectCompany={(value) => setFilter("company", value)} onSelectFacility={(value) => setFilter("facility", value)} />

          <ComparisonFilter value={comparison} onChange={setComparison} />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("ml-auto h-7 gap-1 border-none px-1.5 text-[11px] font-medium text-slate-500 shadow-none hover:bg-transparent hover:text-slate-900", isDefaultState && "invisible")}
            onClick={resetToDefault}
          >
            <FilterX className="size-3 text-slate-500" />
            Varsayılana sıfırla
          </Button>
        </div>

        {dateRangeInvalid && <p className="mt-1.5 text-xs font-medium text-red-700" role="alert">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>}
      </section>

      {queryState.tab === "visits" ? (
        <div ref={visitsPanelRef} role="tabpanel" className="min-h-0 overflow-hidden" style={visitsPanelHeight !== undefined ? { height: visitsPanelHeight } : undefined}>
          <VisitsReportTab visits={visits} filters={filters} dateRangeInvalid={dateRangeInvalid} comparisonEnabled={comparison === "previous"} />
        </div>
      ) : (
        <div role="tabpanel">
          {queryState.tab === "vehicle" ? (
            <FleetReportTab meetings={meetings} visits={visits} filters={filters} dateRangeInvalid={dateRangeInvalid} />
          ) : (
            <GoodsReportTab filters={filters} dateRangeInvalid={dateRangeInvalid} />
          )}
        </div>
      )}
    </div>
  )
}

function ComparisonFilter({ value, onChange }: { value: ComparisonMode; onChange(next: ComparisonMode): void }) {
  const label = comparisonOptions.find((option) => option.value === value)?.label ?? comparisonOptions[0].label

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="h-8 max-w-full justify-start gap-1.5 bg-white px-2.5 text-left text-xs font-normal text-slate-700 shadow-none" aria-label={`Karşılaştırma. ${label}`}>
          <ArrowLeftRight className="size-3.5 shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(15rem,calc(100vw-2rem))] p-1.5" aria-label="Karşılaştırma dönemi seç">
        <DropdownMenuLabel className="text-sm text-slate-900">Karşılaştırma</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as ComparisonMode)}>
          {comparisonOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="data-[state=checked]:bg-blue-50 data-[state=checked]:font-medium data-[state=checked]:text-blue-900">{option.label}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
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
        <Button type="button" variant="outline" className="h-8 max-w-full justify-start gap-1.5 bg-white px-2.5 text-left text-xs font-normal text-slate-700 shadow-none" aria-label={`Rapor kapsamı. ${summary}`}>
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
      <div className="h-48 animate-pulse rounded-lg border bg-white shadow-panel" />
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-lg border bg-white shadow-panel" />)}
      </div>
      <div className="h-96 animate-pulse rounded-lg border bg-white shadow-panel" />
    </div>
  )
}
