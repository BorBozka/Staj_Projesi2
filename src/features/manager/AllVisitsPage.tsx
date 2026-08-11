import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  LoaderCircle,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { InvitationStatus, Visit, VisitStatus } from "@/domain/visits"
import {
  ALL_VISITS_PAGE_SIZE,
  clearAllVisitsSearchParams,
  filterAndSortVisits,
  getFacilitiesForCompany,
  getPageCount,
  getVisiblePageNumbers,
  hasActiveAllVisitsFilters,
  isDateRangeInvalid,
  paginateVisits,
  parseAllVisitsQuery,
  updateAllVisitsSearchParams,
} from "@/features/manager/all-visits-utils"
import { ManagerVisitDetailsSheet } from "@/features/manager/ManagerVisitDetailsSheet"
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

const invitationOptions: { value: "all" | InvitationStatus; label: string }[] = [
  { value: "all", label: "Tüm davet durumları" },
  { value: "NOT_SENT", label: "Davet gönderilmedi" },
  { value: "SENDING", label: "Davet gönderiliyor" },
  { value: "SENT", label: "Davet gönderildi" },
  { value: "FAILED", label: "Gönderim başarısız" },
]

export function AllVisitsPage() {
  const { visits, referenceData, isLoading, error, reload } = useVisits()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)
  const tableSectionRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  const queryState = useMemo(
    () => referenceData ? parseAllVisitsQuery(searchParams, referenceData) : null,
    [referenceData, searchParams],
  )
  const filters = queryState?.filters
  const filteredVisits = useMemo(
    () => filters ? filterAndSortVisits(visits, filters) : [],
    [filters, visits],
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
  const activeFilters = hasActiveAllVisitsFilters(filters)
  const visibleStart = filteredVisits.length === 0 ? 0 : (page - 1) * ALL_VISITS_PAGE_SIZE + 1
  const visibleEnd = Math.min(page * ALL_VISITS_PAGE_SIZE, filteredVisits.length)

  const setFilter = (key: string, value: string, replace = false) => {
    setSearchParams(updateAllVisitsSearchParams(searchParams, key, value), { replace })
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
    <div className="min-w-0 space-y-3">
      <section className="rounded-lg border bg-card p-3 shadow-panel" aria-label="Ziyaret filtreleri">
        <div className="flex justify-end">
          {activeFilters && (
            <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => setSearchParams(clearAllVisitsSearchParams(searchParams))}>
              <X />Filtreleri temizle
            </Button>
          )}
        </div>

        <div className={cn("grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.7fr)_repeat(5,minmax(128px,1fr))_auto]", activeFilters && "mt-2")}>
          <FilterField label="Arama" htmlFor="all-visits-search" className="sm:col-span-2 xl:col-span-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="all-visits-search" value={filters.search} onChange={(event) => setFilter("q", event.target.value, true)} placeholder="Ziyaretçi, ev sahibi, şirket veya tesis ara" className="pl-8" />
            </div>
          </FilterField>
          <FilterField label="Başlangıç" htmlFor="all-visits-from">
            <Input id="all-visits-from" type="date" value={filters.startDate} aria-invalid={dateRangeInvalid} onChange={(event) => setFilter("from", event.target.value)} />
          </FilterField>
          <FilterField label="Bitiş" htmlFor="all-visits-to">
            <Input id="all-visits-to" type="date" value={filters.endDate} aria-invalid={dateRangeInvalid} onChange={(event) => setFilter("to", event.target.value)} />
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
          <Button
            variant="outline"
            className="self-end"
            aria-expanded={queryState.showOtherFilters}
            aria-controls="all-visits-other-filters"
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              if (queryState.showOtherFilters) next.delete("more")
              else next.set("more", "1")
              setSearchParams(next)
            }}
          >
            <SlidersHorizontal />Diğer filtreler{queryState.showOtherFilters ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>

        {dateRangeInvalid && <p className="mt-2 text-xs font-medium text-red-700" role="alert">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>}

        {queryState.showOtherFilters && (
          <div id="all-visits-other-filters" className="mt-2 grid gap-2 rounded-md border bg-slate-50/70 p-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <FilterField label="Ziyaret türü" htmlFor="all-visits-type">
              <FilterSelect id="all-visits-type" value={filters.visitTypeId} emptyLabel="Tüm ziyaret türleri" options={referenceData.visitTypes.map((type) => ({ value: type.id, label: type.name }))} onValueChange={(value) => setFilter("type", value)} />
            </FilterField>
            <FilterField label="Ev sahibi" htmlFor="all-visits-host">
              <FilterSelect id="all-visits-host" value={filters.hostEmployeeId} emptyLabel="Tüm ev sahipleri" options={referenceData.employees.map((employee) => ({ value: employee.id, label: employee.name }))} onValueChange={(value) => setFilter("host", value)} />
            </FilterField>
            <FilterField label="Davet durumu" htmlFor="all-visits-invitation">
              <FilterSelect id="all-visits-invitation" value={filters.invitationStatus} emptyLabel="Tüm davet durumları" options={invitationOptions.filter((option) => option.value !== "all")} onValueChange={(value) => setFilter("invitation", value)} />
            </FilterField>
            <FilterField label="İlave gereksinim" htmlFor="all-visits-additional">
              <FilterSelect id="all-visits-additional" value={filters.additionalRequirement} emptyLabel="Tümü" options={[{ value: "with", label: "Var" }, { value: "without", label: "Yok" }]} onValueChange={(value) => setFilter("additional", value)} />
            </FilterField>
          </div>
        )}
      </section>

      <section ref={tableSectionRef} className="scroll-mt-3 overflow-hidden rounded-lg border bg-card shadow-panel" aria-label="Ziyaret kayıtları">
        {filteredVisits.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <Search className="mx-auto size-8 text-slate-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Eşleşen ziyaret bulunamadı</h3>
            <p className="mt-1 text-xs text-slate-600">Arama veya filtre ölçütlerini değiştirerek yeniden deneyin.</p>
            {activeFilters && <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearchParams(clearAllVisitsSearchParams(searchParams))}>Filtreleri temizle</Button>}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[1080px] table-fixed text-left text-xs">
                <thead className="sticky top-0 z-10 border-b bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-[17%] px-3 py-2">Ziyaretçi</th>
                    <th className="w-[15%] px-3 py-2">Ev sahibi</th>
                    <th className="w-[18%] px-3 py-2">Şirket / tesis</th>
                    <th className="w-[18%] px-3 py-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-sm hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600"
                        onClick={() => setFilter("sort", filters.sortDirection === "asc" ? "desc" : "asc")}
                        aria-label={`Planlanan zamanı ${filters.sortDirection === "asc" ? "azalan" : "artan"} sırala`}
                      >
                        Planlanan zaman{filters.sortDirection === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                      </button>
                    </th>
                    <th className="w-[18%] px-3 py-2">Takip</th>
                    <th className="w-[14%] px-3 py-2">Durum</th>
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
                      <td className="px-3 py-2.5">
                        <p className="truncate font-semibold text-slate-900" title={`${visit.visitor.firstName} ${visit.visitor.lastName}`}>{visit.visitor.firstName} {visit.visitor.lastName}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500" title={visit.visitTypeName}>{visit.visitTypeName}</p>
                      </td>
                      <td className="px-3 py-2.5"><p className="truncate" title={visit.hostEmployeeName}>{visit.hostEmployeeName}</p></td>
                      <td className="px-3 py-2.5">
                        <p className="truncate" title={visit.hostCompanyName}>{visit.hostCompanyName}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500" title={visit.facilityName}>{visit.facilityName}</p>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{formatTr(new Date(visit.plannedStart), "d MMM yyyy · HH:mm")}–{formatTr(new Date(visit.plannedEnd), "HH:mm")}</td>
                      <td className="px-3 py-2.5"><TrackingBadges visit={visit} /></td>
                      <td className="px-3 py-2.5"><VisitStatusBadge status={visit.status} compact /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs tabular-nums text-slate-600">{visibleStart}–{visibleEnd} / {filteredVisits.length} kayıt</p>
              <nav className="flex items-center gap-1" aria-label="Ziyaret sayfaları">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}><ArrowLeft />Önceki</Button>
                {getVisiblePageNumbers(page, pageCount).map((pageNumber) => (
                  <Button key={pageNumber} variant={pageNumber === page ? "default" : "outline"} size="icon-sm" aria-current={pageNumber === page ? "page" : undefined} aria-label={`${pageNumber}. sayfa`} onClick={() => setPage(pageNumber)}>{pageNumber}</Button>
                ))}
                <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(page + 1)}>Sonraki<ArrowRight /></Button>
              </nav>
            </div>
          </>
        )}
      </section>

      <ManagerVisitDetailsSheet
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
  const selectedLabel = options.find((option) => option.value === value)?.label ?? emptyLabel

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button id={id} variant="outline" className="h-9 w-full justify-between px-3 text-left text-sm font-normal" aria-labelledby={`${id}-label ${id}`}>
          <span className="truncate">{selectedLabel}</span><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
        <DropdownMenuRadioGroup value={value === "all" ? "" : value} onValueChange={onValueChange}>
          {options.map((option) => <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const invitationTracking: Record<InvitationStatus, { label: string; icon: typeof Send; className: string }> = {
  NOT_SENT: { label: "Davet gönderilmedi", icon: Send, className: "border-amber-200 bg-amber-50 text-amber-800" },
  SENDING: { label: "Davet gönderiliyor", icon: LoaderCircle, className: "border-blue-200 bg-blue-50 text-blue-800" },
  SENT: { label: "Davet gönderildi", icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  FAILED: { label: "Gönderim başarısız", icon: AlertCircle, className: "border-red-200 bg-red-50 text-red-800" },
}

function TrackingBadges({ visit }: { visit: Visit }) {
  const invitation = invitationTracking[visit.invitationStatus]
  const InvitationIcon = invitation.icon
  return (
    <div className="flex flex-wrap gap-1">
      <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium", invitation.className)}>
        <InvitationIcon className={cn("size-2.5", visit.invitationStatus === "SENDING" && "animate-spin")} />{invitation.label}
      </span>
      {visit.hasAdditionalRequirements && (
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">
          <ClipboardList className="size-2.5" />İlave gereksinim var
        </span>
      )}
    </div>
  )
}

function AllVisitsSkeleton() {
  return (
    <div className="space-y-3" aria-label="Tüm ziyaretler yükleniyor" role="status">
      <div className="rounded-lg border bg-white p-3 shadow-panel">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-11 animate-pulse rounded bg-slate-100" />)}
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white shadow-panel">
        <div className="h-10 animate-pulse border-b bg-slate-100" />
        {Array.from({ length: 10 }, (_, index) => <div key={index} className="h-12 animate-pulse border-b bg-white px-3 py-3"><div className="h-full rounded bg-slate-100" /></div>)}
      </div>
    </div>
  )
}
