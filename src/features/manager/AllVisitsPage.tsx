import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ClipboardList,
  FilterX,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { Visit, VisitStatus } from "@/domain/visits"
import {
  ALL_VISITS_PAGE_SIZE,
  clearAllVisitsSearchParams,
  countVisitsWithAdditionalRequirements,
  filterAndSortVisits,
  getFacilitiesForCompany,
  getPageCount,
  getVisiblePageNumbers,
  hasActiveAllVisitsFilters,
  isDateRangeInvalid,
  paginateVisits,
  parseAllVisitsQuery,
  toggleVisitSort,
  updateAllVisitsSearchParams,
  type VisitSort,
  type VisitSortField,
} from "@/features/manager/all-visits-utils"
import { ManagerVisitDetailsDialog } from "@/features/manager/ManagerVisitDetailsDialog"
import { VisitStatusBadge } from "@/features/visits/VisitStatusBadge"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"

const statusOptions: { value: "all" | VisitStatus; label: string }[] = [
  { value: "all", label: "Tüm durumlar" },
  { value: "PLANNED", label: "Planlandı" },
  { value: "CHECKED_IN", label: "İçeride" },
  { value: "CHECKED_OUT", label: "Çıkış yapıldı" },
  { value: "CANCELLED", label: "İptal edildi" },
  { value: "NO_SHOW", label: "Gelmedi" },
]

export function AllVisitsPage() {
  const { visits, referenceData, isLoading, error, reload } = useVisits()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)
  const [sorts, setSorts] = useState<VisitSort[]>([])
  const tableSectionRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  const queryState = useMemo(
    () => referenceData ? parseAllVisitsQuery(searchParams, referenceData) : null,
    [referenceData, searchParams],
  )
  const filters = queryState?.filters

  const additionalCount = useMemo(
    () => filters ? countVisitsWithAdditionalRequirements(visits, filters) : 0,
    [filters, visits],
  )

  const filteredVisits = useMemo(
    () => filters ? filterAndSortVisits(visits, filters, sorts) : [],
    [filters, visits, sorts],
  )
  const pageCount = getPageCount(filteredVisits.length)
  const page = queryState?.page ?? 1
  const paginatedVisits = paginateVisits(filteredVisits, page)
  const selectedVisit = visits.find((visit) => visit.id === selectedVisitId) ?? null
  const dateRangeInvalid = filters ? isDateRangeInvalid(filters) : false

  useEffect(() => {
    if (!queryState || page <= pageCount) return
    const next = new URLSearchParams(searchParams)
    next.delete("page")
    setSearchParams(next, { replace: true })
  }, [page, pageCount, queryState, searchParams, setSearchParams])

  if (isLoading) return <AllVisitsSkeleton />

  if (error || !referenceData || !filters || !queryState) {
    return (
      <section className="rounded-lg border border-red-200 bg-white px-5 py-12 text-center shadow-panel" role="alert">
        <AlertCircle className="mx-auto size-8 text-red-600" />
        <h1 className="mt-3 text-base font-semibold text-slate-900">Ziyaret kayıtları yüklenemedi</h1>
        <p className="mt-1 text-sm text-slate-600">{error ?? "Referans verileri alınamadı."}</p>
        <Button className="mt-4" onClick={() => void reload()}>Tekrar dene</Button>
      </section>
    )
  }

  const facilities = getFacilitiesForCompany(referenceData, filters.companyId)
  const activeFilters = hasActiveAllVisitsFilters(filters) || sorts.length > 0
  const visibleStart = filteredVisits.length === 0 ? 0 : (page - 1) * ALL_VISITS_PAGE_SIZE + 1
  const visibleEnd = Math.min(page * ALL_VISITS_PAGE_SIZE, filteredVisits.length)

  const setFilter = (key: string, value: string, replace = false) => {
    setSearchParams(updateAllVisitsSearchParams(searchParams, key, value), { replace })
  }

  const clearFilters = () => {
    setSearchParams(clearAllVisitsSearchParams(searchParams))
    setSorts([])
  }

  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams)
    if (nextPage <= 1) next.delete("page")
    else next.set("page", String(nextPage))
    setSearchParams(next)
    window.requestAnimationFrame(() => tableSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }))
  }

  const openVisit = (visit: Visit, trigger: HTMLElement | null) => {
    returnFocusRef.current = trigger
    setSelectedVisitId(visit.id)
  }

  return (
    <div className="min-w-0 space-y-3 md:space-y-3.5">
      <section className="rounded-lg border bg-card p-3 shadow-panel" aria-label="Ziyaret filtreleri">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ziyaret Filtreleri</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-5 gap-1 border-none px-1 text-[11px] font-medium text-slate-500 shadow-none hover:bg-transparent hover:text-slate-900", !activeFilters && "invisible")}
            onClick={clearFilters}
          >
            <FilterX className="size-3 text-slate-500" />
            Filtreleri temizle
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1.5fr)_repeat(5,minmax(120px,1fr))_auto_auto]">
          <FilterField label="Arama" htmlFor="all-visits-search" className="sm:col-span-2 xl:col-span-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="all-visits-search" value={filters.search} onChange={(event) => setFilter("q", event.target.value, true)} placeholder="Ziyaretçi, ev sahibi, şirket veya tesis ara" className="pl-8 h-9 text-xs" />
            </div>
          </FilterField>
          <FilterField label="Başlangıç" htmlFor="all-visits-from">
            <Input id="all-visits-from" type="date" value={filters.startDate} aria-invalid={dateRangeInvalid} onChange={(event) => setFilter("from", event.target.value)} className="h-9 text-xs" />
          </FilterField>
          <FilterField label="Bitiş" htmlFor="all-visits-to">
            <Input id="all-visits-to" type="date" value={filters.endDate} aria-invalid={dateRangeInvalid} onChange={(event) => setFilter("to", event.target.value)} className="h-9 text-xs" />
          </FilterField>
          <FilterField label="Şirket" htmlFor="all-visits-company">
            <FilterSelect id="all-visits-company" value={filters.companyId} emptyLabel="Tüm şirketler" options={referenceData.companies.map((company) => ({ value: company.id, label: company.name }))} onValueChange={(value) => setFilter("company", value)} />
          </FilterField>
          <FilterField label="Tesis" htmlFor="all-visits-facility">
            <FilterSelect id="all-visits-facility" value={filters.facilityId} emptyLabel="Tüm tesisler" options={facilities.map((facility) => ({ value: facility.id, label: facility.name }))} onValueChange={(value) => setFilter("facility", value)} />
          </FilterField>
          <FilterField label="Durum" htmlFor="all-visits-status">
            <FilterSelect id="all-visits-status" value={filters.status} emptyLabel="Tüm durumlar" options={statusOptions.filter((option) => option.value !== "all")} onValueChange={(value) => setFilter("status", value)} />
          </FilterField>

          {/* First-class "İlave gereksinim" Quick Filter */}
          <div className="flex flex-col justify-end">
            <Button
              type="button"
              variant={filters.additionalRequirement === "with" ? "default" : "outline"}
              className={cn(
                "h-9 gap-1 text-xs transition-colors",
                filters.additionalRequirement === "with"
                  ? "border-violet-700 bg-violet-700 text-white hover:bg-violet-800 shadow-xs font-medium"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
              onClick={() => {
                const nextVal = filters.additionalRequirement === "with" ? "all" : "with"
                setFilter("additional", nextVal)
              }}
              title="İlave gereksinimi olan ziyaretleri filtrele"
              aria-pressed={filters.additionalRequirement === "with"}
            >
              <ClipboardList className="size-3.5 shrink-0" />
              <span>İlave gereksinim</span>
              <span
                className={cn(
                  "ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-semibold",
                  filters.additionalRequirement === "with"
                    ? "bg-violet-900 text-violet-100"
                    : "bg-violet-100 text-violet-800",
                )}
              >
                {additionalCount}
              </span>
            </Button>
          </div>

          <div className="flex flex-col justify-end">
            <Button
              variant="outline"
              className="h-9 gap-1 text-xs"
              aria-expanded={queryState.showOtherFilters}
              aria-controls="all-visits-other-filters"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                if (queryState.showOtherFilters) next.delete("more")
                else next.set("more", "1")
                setSearchParams(next)
              }}
            >
              <SlidersHorizontal className="size-3.5" />Diğer{queryState.showOtherFilters ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </Button>
          </div>
        </div>

        {dateRangeInvalid && <p className="mt-2 text-xs font-medium text-red-700" role="alert">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>}

        {queryState.showOtherFilters && (
          <div id="all-visits-other-filters" className="mt-2.5 grid gap-2 rounded-md border bg-slate-50/70 p-2.5 sm:grid-cols-2">
            <FilterField label="Ziyaret türü" htmlFor="all-visits-type">
              <FilterSelect id="all-visits-type" value={filters.visitTypeId} emptyLabel="Tüm ziyaret türleri" options={referenceData.visitTypes.map((type) => ({ value: type.id, label: type.name }))} onValueChange={(value) => setFilter("type", value)} />
            </FilterField>
            <FilterField label="Ev sahibi" htmlFor="all-visits-host">
              <FilterSelect id="all-visits-host" value={filters.hostEmployeeId} emptyLabel="Tüm ev sahipleri" options={referenceData.employees.map((employee) => ({ value: employee.id, label: employee.name }))} onValueChange={(value) => setFilter("host", value)} />
            </FilterField>
          </div>
        )}
      </section>

      <section ref={tableSectionRef} className="scroll-mt-3 flex h-[35.5rem] flex-col justify-between overflow-hidden rounded-lg border bg-card shadow-panel" aria-label="Ziyaret listesi">
        {filteredVisits.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
            <Search className="mx-auto size-8 text-slate-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Eşleşen ziyaret bulunamadı</h3>
            <p className="mt-1 text-xs text-slate-600">Arama veya filtre ölçütlerini değiştirerek yeniden deneyin.</p>
            {activeFilters && <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Filtreleri temizle</Button>}
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[1080px] table-fixed text-left text-xs">
              <thead className="sticky top-0 z-10 border-b bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-[16%] px-3 py-2.5">
                    <SortButton label="ZİYARETÇİ" field="visitor" sorts={sorts} onToggle={(field) => setSorts((current) => toggleVisitSort(current, field))} />
                  </th>
                  <th className="w-[14%] px-3 py-2.5">
                    <SortButton label="ZİYARET TÜRÜ" field="visitType" sorts={sorts} onToggle={(field) => setSorts((current) => toggleVisitSort(current, field))} />
                  </th>
                  <th className="w-[14%] px-3 py-2.5">
                    <SortButton label="EV SAHİBİ" field="host" sorts={sorts} onToggle={(field) => setSorts((current) => toggleVisitSort(current, field))} />
                  </th>
                  <th className="w-[18%] px-3 py-2.5">
                    <SortButton label="ŞİRKET / TESİS" field="companyFacility" sorts={sorts} onToggle={(field) => setSorts((current) => toggleVisitSort(current, field))} />
                  </th>
                  <th className="w-[24%] px-3 py-2.5">
                    <SortButton label="PLANLANAN ZAMAN" field="plannedStart" sorts={sorts} onToggle={(field) => setSorts((current) => toggleVisitSort(current, field))} />
                  </th>
                  <th className="w-[14%] px-3 py-2.5">
                    <SortButton label="DURUM" field="status" sorts={sorts} onToggle={(field) => setSorts((current) => toggleVisitSort(current, field))} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedVisits.map((visit) => (
                  <tr
                    key={visit.id}
                    tabIndex={0}
                    className="cursor-pointer select-none transition-colors hover:bg-slate-50 focus:bg-blue-50/60 focus:outline focus:outline-1 focus:-outline-offset-1 focus:outline-blue-500"
                    onClick={(event) => openVisit(visit, event.currentTarget)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        openVisit(visit, event.currentTarget)
                      }
                    }}
                  >
                    <td className="px-3 py-2.5 sm:py-3">
                      <p className="truncate font-semibold text-slate-900" title={`${visit.visitor.firstName} ${visit.visitor.lastName}`}>{visit.visitor.firstName} {visit.visitor.lastName}</p>
                    </td>
                    <td className="px-3 py-2.5 sm:py-3"><p className="truncate" title={visit.visitTypeName}>{visit.visitTypeName}</p></td>
                    <td className="px-3 py-2.5 sm:py-3"><p className="truncate" title={visit.hostEmployeeName}>{visit.hostEmployeeName}</p></td>
                    <td className="px-3 py-2.5 sm:py-3">
                      <p className="truncate" title={visit.hostCompanyName}>{visit.hostCompanyName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500" title={visit.facilityName}>{visit.facilityName}</p>
                    </td>
                    <td className="px-3 py-2.5 sm:py-3 tabular-nums">{formatTr(new Date(visit.plannedStart), "d MMM yyyy · HH:mm")}–{formatTr(new Date(visit.plannedEnd), "HH:mm")}</td>
                    <td className="px-3 py-2.5 sm:py-3"><VisitStatusBadge status={visit.status} compact /></td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, ALL_VISITS_PAGE_SIZE - paginatedVisits.length) }).map((_, index) => (
                  <tr key={`filler-${index}`} aria-hidden="true" className={cn("pointer-events-none select-none", index > 0 && "border-transparent")}>
                    <td className="px-3 py-2.5 sm:py-3">
                      <p className="truncate font-semibold text-transparent">&nbsp;</p>
                    </td>
                    <td className="px-3 py-2.5 sm:py-3 text-transparent">&nbsp;</td>
                    <td className="px-3 py-2.5 sm:py-3 text-transparent">&nbsp;</td>
                    <td className="px-3 py-2.5 sm:py-3 text-transparent">&nbsp;</td>
                    <td className="px-3 py-2.5 sm:py-3 text-transparent">&nbsp;</td>
                    <td className="px-3 py-2.5 sm:py-3 text-transparent">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs tabular-nums text-slate-600">{visibleStart}–{visibleEnd} / {filteredVisits.length} kayıt</p>
          <nav className="flex items-center gap-1" aria-label="Ziyaret sayfaları">
            {page > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8 text-xs"
                  onClick={() => setPage(1)}
                  title="İlk sayfa"
                  aria-label="İlk sayfa"
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8 text-xs"
                  onClick={() => setPage(page - 1)}
                  title="Önceki sayfa"
                  aria-label="Önceki sayfa"
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </>
            )}
            {(() => {
              const visible = getVisiblePageNumbers(page, Math.max(1, pageCount))
              const num1 = visible[0] ?? null
              const num2 = visible[1] ?? null
              const num3 = visible[2] ?? null
              return (
                <>
                  {num1 !== null ? (
                    <Button
                      key={num1}
                      variant={num1 === page ? "default" : "outline"}
                      size="icon-sm"
                      className="h-8 w-8 text-xs"
                      aria-current={num1 === page ? "page" : undefined}
                      aria-label={`${num1}. sayfa`}
                      onClick={() => setPage(num1)}
                    >
                      {num1}
                    </Button>
                  ) : (
                    <span key="slot-num-1" className="h-8 w-8 invisible" aria-hidden="true" />
                  )}
                  {num2 !== null ? (
                    <Button
                      key={num2}
                      variant={num2 === page ? "default" : "outline"}
                      size="icon-sm"
                      className="h-8 w-8 text-xs"
                      aria-current={num2 === page ? "page" : undefined}
                      aria-label={`${num2}. sayfa`}
                      onClick={() => setPage(num2)}
                    >
                      {num2}
                    </Button>
                  ) : (
                    <span key="slot-num-2" className="h-8 w-8 invisible" aria-hidden="true" />
                  )}
                  {num3 !== null ? (
                    <Button
                      key={num3}
                      variant={num3 === page ? "default" : "outline"}
                      size="icon-sm"
                      className="h-8 w-8 text-xs"
                      aria-current={num3 === page ? "page" : undefined}
                      aria-label={`${num3}. sayfa`}
                      onClick={() => setPage(num3)}
                    >
                      {num3}
                    </Button>
                  ) : (
                    <span key="slot-num-3" className="h-8 w-8 invisible" aria-hidden="true" />
                  )}
                </>
              )
            })()}
            {page < pageCount ? (
              <>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8 text-xs"
                  onClick={() => setPage(page + 1)}
                  title="Sonraki sayfa"
                  aria-label="Sonraki sayfa"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8 text-xs"
                  onClick={() => setPage(pageCount)}
                  title="Son sayfa"
                  aria-label="Son sayfa"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <span key="slot-next" className="h-8 w-8 invisible" aria-hidden="true" />
                <span key="slot-last" className="h-8 w-8 invisible" aria-hidden="true" />
              </>
            )}
          </nav>
        </div>
      </section>

      <ManagerVisitDetailsDialog
        visit={selectedVisit}
        open={Boolean(selectedVisit)}
        onOpenChange={(open) => !open && setSelectedVisitId(null)}
        returnFocusRef={returnFocusRef}
      />
    </div>
  )
}

function FilterField({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label id={`${htmlFor}-label`} htmlFor={htmlFor} className="mb-1 block text-[11px] font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

function FilterSelect({ id, value, emptyLabel, options, onValueChange }: {
  id: string
  value: string
  emptyLabel: string
  options: { value: string; label: string }[]
  onValueChange(value: string): void
}) {
  const fullOptions = useMemo(() => {
    if (options.some((option) => option.value === "all")) return options
    return [{ value: "all", label: emptyLabel }, ...options]
  }, [emptyLabel, options])

  const selectedLabel = fullOptions.find((option) => option.value === value)?.label ?? emptyLabel

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button id={id} variant="outline" className="h-9 w-full justify-between px-3 text-left text-xs font-normal" aria-labelledby={`${id}-label ${id}`}>
          <span className="truncate">{selectedLabel}</span><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {fullOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SortButton({ label, field, sorts, onToggle }: {
  label: string
  field: VisitSortField
  sorts: VisitSort[]
  onToggle(field: VisitSortField): void
}) {
  const activeSort = sorts.find((sort) => sort.field === field)

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-sm hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600"
      onClick={() => onToggle(field)}
      aria-label={activeSort?.direction === "desc" ? `${label} sütunu sıralamasını kaldır` : `${label} sütununu ${activeSort?.direction === "asc" ? "azalan" : "artan"} sırala`}
    >
      {label}
      {activeSort ? (
        activeSort.direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
      ) : null}
    </button>
  )
}

function AllVisitsSkeleton() {
  return (
    <div className="space-y-3" aria-label="Tüm ziyaretler yükleniyor" role="status">
      <div className="rounded-lg border bg-white p-3 shadow-panel">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-9 animate-pulse rounded bg-slate-100" />)}
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white shadow-panel">
        <div className="h-10 animate-pulse border-b bg-slate-100" />
        {Array.from({ length: 10 }, (_, index) => <div key={index} className="h-12 animate-pulse border-b bg-white px-3 py-2.5"><div className="h-full rounded bg-slate-100" /></div>)}
      </div>
    </div>
  )
}
