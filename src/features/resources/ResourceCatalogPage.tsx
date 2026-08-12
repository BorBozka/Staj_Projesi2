import { AlertCircle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Boxes, ChevronDown, Plus, RotateCcw, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getResourceDisplayName, resourceTypeLabels, resourceTypes, type FacilityResource, type ResourceInput } from "@/domain/resources"
import {
  defaultResourceFilters,
  filterResources,
  getResourcePageCount,
  getVisibleResourcePageNumbers,
  hasActiveResourceFilters,
  paginateResources,
  RESOURCE_PAGE_SIZE,
  type ResourceFilters,
  type ResourceSort,
  sortResources,
  toggleResourceSort,
} from "@/features/resources/resource-filters"
import { ResourceFormDialog } from "@/features/resources/ResourceFormDialog"
import { useResources } from "@/features/resources/resource-context"
import { useVisits } from "@/features/visits/visit-context"
import { cn } from "@/lib/utils"

export function ResourceCatalogPage() {
  const { resources, isLoading, error, reload, createResource, updateResource, setResourceActive } = useResources()
  const { referenceData, isLoading: visitsLoading, error: visitsError, reload: reloadVisits } = useVisits()
  const [filters, setFilters] = useState<ResourceFilters>(defaultResourceFilters)
  const [sorts, setSorts] = useState<ResourceSort[]>([])
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedResource, setSelectedResource] = useState<FacilityResource | null>(null)
  const [transitioningResourceId, setTransitioningResourceId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null)
  const tableSectionRef = useRef<HTMLElement>(null)
  const dialogReturnFocusRef = useRef<HTMLElement | null>(null)

  const facilities = useMemo(
    () => referenceData?.facilities.filter((facility) => filters.companyId === "all" || facility.companyId === filters.companyId) ?? [],
    [filters.companyId, referenceData?.facilities],
  )
  const filteredResources = useMemo(
    () => sortResources(filterResources(resources, filters), sorts),
    [filters, resources, sorts],
  )
  const pageCount = getResourcePageCount(filteredResources.length)
  const paginatedResources = paginateResources(filteredResources, page)
  const activeFilters = hasActiveResourceFilters(filters)
  const visibleStart = filteredResources.length === 0 ? 0 : (page - 1) * RESOURCE_PAGE_SIZE + 1
  const visibleEnd = Math.min(page * RESOURCE_PAGE_SIZE, filteredResources.length)

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  if (isLoading || visitsLoading) return <ResourceCatalogSkeleton />

  if (error || visitsError || !referenceData) {
    return (
      <section className="rounded-lg border border-red-200 bg-white px-5 py-12 text-center shadow-panel" role="alert">
        <AlertCircle className="mx-auto size-8 text-red-600" />
        <h1 className="mt-3 text-base font-semibold text-slate-900">Kaynak kataloğu yüklenemedi</h1>
        <p className="mt-1 text-sm text-slate-600">{error ?? visitsError ?? "Organizasyon referansları alınamadı."}</p>
        <Button className="mt-4" onClick={() => void Promise.all([reload(), reloadVisits()])}>Tekrar dene</Button>
      </section>
    )
  }

  const openCreateDialog = (trigger: HTMLElement) => {
    dialogReturnFocusRef.current = trigger
    setSelectedResource(null)
    setDialogOpen(true)
  }

  const openEditDialog = (resource: FacilityResource, trigger: HTMLElement) => {
    dialogReturnFocusRef.current = trigger
    setSelectedResource(resource)
    setDialogOpen(true)
  }

  const updateFilters = (updater: (current: ResourceFilters) => ResourceFilters) => {
    setFilters(updater)
    setPage(1)
  }

  const clearFilters = () => {
    setFilters(defaultResourceFilters)
    setPage(1)
  }

  const changePage = (nextPage: number) => {
    setPage(nextPage)
    window.requestAnimationFrame(() => tableSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }))
  }

  const saveResource = async (input: ResourceInput) => {
    const displayName = getResourceDisplayName(input)
    if (selectedResource) {
      await updateResource(selectedResource.id, input)
      setFeedback({ tone: "success", message: `${displayName} güncellendi.` })
    } else {
      await createResource(input)
      setFeedback({ tone: "success", message: `${displayName} kataloğa eklendi.` })
    }
  }

  const toggleResource = async (resource: FacilityResource) => {
    setTransitioningResourceId(resource.id)
    setFeedback(null)
    try {
      const updated = await setResourceActive(resource.id, !resource.isActive)
      setSelectedResource((current) => current?.id === updated.id ? updated : current)
      setFeedback({
        tone: "success",
        message: `${getResourceDisplayName(resource)} ${resource.isActive ? "pasife" : "aktife"} alındı.`,
      })
    } catch (toggleError) {
      setFeedback({
        tone: "error",
        message: toggleError instanceof Error ? toggleError.message : "Kaynak durumu değiştirilemedi.",
      })
    } finally {
      setTransitioningResourceId(null)
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      <h1 className="sr-only">Kaynaklar</h1>

      <section className="rounded-lg border bg-card p-3 shadow-panel" aria-label="Kaynak filtreleri">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(128px,1fr))_auto]">
          <FilterField label="Şirket" htmlFor="resource-company">
            <FilterSelect
              id="resource-company"
              value={filters.companyId}
              emptyLabel="Tüm şirketler"
              options={referenceData.companies.map((company) => ({ value: company.id, label: company.name }))}
              onValueChange={(value) => updateFilters((current) => ({ ...current, companyId: value, facilityId: "all" }))}
            />
          </FilterField>
          <FilterField label="Tesis" htmlFor="resource-facility">
            <FilterSelect id="resource-facility" value={filters.facilityId} emptyLabel="Tüm tesisler" options={facilities.map((facility) => ({ value: facility.id, label: facility.name }))} onValueChange={(value) => updateFilters((current) => ({ ...current, facilityId: value }))} />
          </FilterField>
          <FilterField label="Kaynak türü" htmlFor="resource-type">
            <FilterSelect id="resource-type" value={filters.type} emptyLabel="Tüm kaynak türleri" options={resourceTypes.map((type) => ({ value: type, label: resourceTypeLabels[type] }))} onValueChange={(value) => updateFilters((current) => ({ ...current, type: value as ResourceFilters["type"] }))} />
          </FilterField>
          <FilterField label="Durum" htmlFor="resource-status">
            <FilterSelect id="resource-status" value={filters.active} emptyLabel="Tüm durumlar" options={[{ value: "active", label: "Aktif" }, { value: "inactive", label: "Pasif" }]} onValueChange={(value) => updateFilters((current) => ({ ...current, active: value as ResourceFilters["active"] }))} />
          </FilterField>
          <div className="flex flex-col gap-1 sm:col-span-2 sm:items-end xl:col-span-1 xl:row-span-2 xl:items-stretch">
            <div className="flex h-4 items-center xl:justify-end">
              {activeFilters && <Button variant="ghost" size="sm" className="h-auto px-0 py-0 text-xs font-normal text-slate-600 hover:bg-transparent hover:text-slate-900" onClick={clearFilters}><RotateCcw />Filtreleri temizle</Button>}
            </div>
            <Button className="w-full xl:mt-1" onClick={(event) => openCreateDialog(event.currentTarget)}><Plus />Yeni kaynak</Button>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs",
            feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800",
          )}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          <span>{feedback.message}</span>
          <Button variant="ghost" size="icon-sm" className="shrink-0" aria-label="Bildirimi kapat" onClick={() => setFeedback(null)}><X /></Button>
        </div>
      )}

      <section ref={tableSectionRef} className="scroll-mt-3 overflow-hidden rounded-lg border bg-card shadow-panel" aria-label="Kaynak kataloğu">
        {filteredResources.length === 0 ? (
          <ResourceEmptyState
            filtered={resources.length > 0 && activeFilters}
            onClear={clearFilters}
            onCreate={openCreateDialog}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] table-fixed text-left text-xs">
                <thead className="sticky top-0 z-10 border-b bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <SortableHeader label="Kaynak" sort={sorts.find((sort) => sort.field === "name")} className="w-[25%]" onClick={() => setSorts((current) => toggleResourceSort(current, "name"))} />
                    <SortableHeader label="Tür" sort={sorts.find((sort) => sort.field === "type")} className="w-[17%]" onClick={() => setSorts((current) => toggleResourceSort(current, "type"))} />
                    <SortableHeader label="Şirket / tesis" sort={sorts.find((sort) => sort.field === "location")} className="w-[25%]" onClick={() => setSorts((current) => toggleResourceSort(current, "location"))} />
                    <SortableHeader label="Miktar" sort={sorts.find((sort) => sort.field === "quantity")} className="w-[10%]" onClick={() => setSorts((current) => toggleResourceSort(current, "quantity"))} />
                    <SortableHeader label="Durum" sort={sorts.find((sort) => sort.field === "status")} className="w-[10%]" onClick={() => setSorts((current) => toggleResourceSort(current, "status"))} />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedResources.map((resource) => (
                    <tr
                      key={resource.id}
                      tabIndex={0}
                      className={cn("cursor-pointer select-none transition-colors hover:bg-slate-50 focus-visible:bg-blue-50/60 focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-blue-500", !resource.isActive && "bg-slate-50/70 hover:bg-slate-100/70")}
                      onClick={(event) => openEditDialog(resource, event.currentTarget)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          openEditDialog(resource, event.currentTarget)
                        }
                      }}
                    >
                      <td className="px-3 py-2.5"><ResourceIdentity resource={resource} /></td>
                      <td className="px-3 py-2.5">{resourceTypeLabels[resource.type]}</td>
                      <td className="px-3 py-2.5">
                        <p className="truncate">{resource.companyName}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{resource.facilityName}</p>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{formatQuantity(resource)}</td>
                      <td className="px-3 py-2.5"><ResourceStatus active={resource.isActive} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y md:hidden">
              {paginatedResources.map((resource) => (
                <article
                  key={resource.id}
                  tabIndex={0}
                  className={cn("cursor-pointer select-none p-3 transition-colors hover:bg-slate-50 focus-visible:bg-blue-50/60 focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-blue-500", !resource.isActive && "bg-slate-50/70 hover:bg-slate-100/70")}
                  onClick={(event) => openEditDialog(resource, event.currentTarget)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      openEditDialog(resource, event.currentTarget)
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900">{getResourceDisplayName(resource)}</h3>
                      <p className="mt-0.5 text-xs text-slate-600">{resourceTypeLabels[resource.type]}</p>
                      {getResourceDetail(resource) && <p className="mt-0.5 truncate text-[11px] text-slate-500">{getResourceDetail(resource)}</p>}
                    </div>
                    <ResourceStatus active={resource.isActive} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div><dt className="text-slate-500">Şirket</dt><dd className="mt-0.5 font-medium text-slate-800">{resource.companyName}</dd></div>
                    <div><dt className="text-slate-500">Tesis</dt><dd className="mt-0.5 font-medium text-slate-800">{resource.facilityName}</dd></div>
                    <div><dt className="text-slate-500">Miktar</dt><dd className="mt-0.5 font-medium tabular-nums text-slate-800">{formatQuantity(resource)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs tabular-nums text-slate-600">{pageCount > 1 ? `${filteredResources.length} kaydın ${visibleStart}–${visibleEnd}’u` : `${filteredResources.length} kayıt`}</p>
              {pageCount > 1 && (
                <nav className="flex items-center gap-1" aria-label="Kaynak sayfaları">
                  {page > 1 && <Button variant="outline" size="sm" onClick={() => changePage(page - 1)}><ArrowLeft />Önceki</Button>}
                  {getVisibleResourcePageNumbers(page, pageCount).map((pageNumber) => (
                    <Button key={pageNumber} variant={pageNumber === page ? "default" : "outline"} size="icon-sm" aria-current={pageNumber === page ? "page" : undefined} aria-label={`${pageNumber}. sayfa`} onClick={() => changePage(pageNumber)}>{pageNumber}</Button>
                  ))}
                  {page < pageCount && <Button variant="outline" size="sm" onClick={() => changePage(page + 1)}>Sonraki<ArrowRight /></Button>}
                </nav>
              )}
            </div>
          </>
        )}
      </section>

      <ResourceFormDialog
        open={dialogOpen}
        resource={selectedResource}
        referenceData={referenceData}
        returnFocusRef={dialogReturnFocusRef}
        onOpenChange={setDialogOpen}
        onSave={saveResource}
        onToggleActive={toggleResource}
        isTogglingActive={transitioningResourceId === selectedResource?.id}
      />
    </div>
  )
}

function FilterField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div><label id={`${htmlFor}-label`} htmlFor={htmlFor} className="mb-1 block text-[11px] font-medium text-slate-600">{label}</label>{children}</div>
}

function SortableHeader({ label, sort, className, onClick }: { label: string; sort?: ResourceSort; className: string; onClick(): void }) {
  return (
    <th className={cn(className, "px-3 py-2")} aria-sort={sort?.direction === "asc" ? "ascending" : sort?.direction === "desc" ? "descending" : "none"}>
      <button type="button" className="inline-flex items-center gap-1 rounded-sm hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600" onClick={onClick}>
        {label}{sort?.direction === "asc" ? <ArrowUp className="size-3" /> : sort?.direction === "desc" ? <ArrowDown className="size-3" /> : null}
      </button>
    </th>
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
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          <DropdownMenuRadioItem value="all">{emptyLabel}</DropdownMenuRadioItem>
          {options.map((option) => <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ResourceStatus({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
      active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-100 text-slate-600",
    )}>
      {active ? "Aktif" : "Pasif"}
    </span>
  )
}

function ResourceEmptyState({ filtered, onClear, onCreate }: { filtered: boolean; onClear(): void; onCreate(trigger: HTMLElement): void }) {
  return (
    <div className="px-4 py-14 text-center">
      <Boxes className="mx-auto size-8 text-slate-400" />
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{filtered ? "Filtrelerle eşleşen kaynak yok" : "Kaynak kataloğu boş"}</h3>
      <p className="mt-1 text-xs text-slate-600">{filtered ? "Filtreleri değiştirerek yeniden deneyin." : "İlk katalog kaynağını ekleyin."}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={(event) => filtered ? onClear() : onCreate(event.currentTarget)}>{filtered ? "Filtreleri temizle" : "Yeni kaynak"}</Button>
    </div>
  )
}

function formatQuantity(resource: FacilityResource) {
  return resource.type === "POOLED_EQUIPMENT" ? resource.totalQuantity : "—"
}

function ResourceIdentity({ resource }: { resource: FacilityResource }) {
  const displayName = getResourceDisplayName(resource)
  const detail = getResourceDetail(resource)
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-slate-900">{displayName}</p>
      {detail && <p className="mt-0.5 truncate text-[11px] text-slate-500">{detail}</p>}
    </div>
  )
}

function getResourceDetail(resource: FacilityResource) {
  switch (resource.type) {
    case "VEHICLE":
      return `Plaka: ${resource.licensePlate}`
    case "DRIVER": {
      const documentSummary = resource.documents.length === 0
        ? "Belge: Yok"
        : `Belgeler: ${resource.documents[0]}${resource.documents.length > 1 ? ` +${resource.documents.length - 1}` : ""}`
      return `Ehliyet: ${resource.licenseClasses.join(", ")} · Ticari araç: ${resource.canDriveCommercialVehicles ? "Evet" : "Hayır"} · ${documentSummary}`
    }
    default:
      return null
  }
}

function ResourceCatalogSkeleton() {
  return (
    <div className="space-y-3" aria-label="Kaynak kataloğu yükleniyor" role="status">
      <div className="rounded-lg border bg-white p-3 shadow-panel">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(128px,1fr))_auto]">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded bg-slate-100" />)}
          <div className="h-9 w-full animate-pulse self-end rounded bg-slate-200 sm:col-span-2 sm:w-28 sm:justify-self-end xl:col-span-1" />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white shadow-panel">
        <div className="h-9 animate-pulse border-b bg-slate-100" />
        {Array.from({ length: RESOURCE_PAGE_SIZE }, (_, index) => <div key={index} className="h-12 animate-pulse border-b bg-white p-3"><div className="h-full rounded bg-slate-100" /></div>)}
        <div className="h-12 animate-pulse bg-slate-50" />
      </div>
    </div>
  )
}
