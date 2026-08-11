import { AlertCircle, Boxes, Pencil, Plus, Power, PowerOff, X } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import type { FacilityResource, ResourceInput } from "@/domain/resources"
import { resourceTypeLabels } from "@/domain/resources"
import {
  defaultResourceFilters,
  filterResources,
  hasActiveResourceFilters,
  type ResourceFilters,
} from "@/features/resources/resource-filters"
import { ResourceFormDialog } from "@/features/resources/ResourceFormDialog"
import { useResources } from "@/features/resources/resource-context"
import { useVisits } from "@/features/visits/visit-context"
import { cn } from "@/lib/utils"

export function ResourceCatalogPage() {
  const { resources, isLoading, error, reload, createResource, updateResource, setResourceActive } = useResources()
  const { referenceData, isLoading: visitsLoading, error: visitsError, reload: reloadVisits } = useVisits()
  const [filters, setFilters] = useState<ResourceFilters>(defaultResourceFilters)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedResource, setSelectedResource] = useState<FacilityResource | null>(null)
  const [transitioningResourceId, setTransitioningResourceId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null)

  const facilities = useMemo(
    () => referenceData?.facilities.filter((facility) => filters.companyId === "all" || facility.companyId === filters.companyId) ?? [],
    [filters.companyId, referenceData?.facilities],
  )
  const filteredResources = useMemo(() => filterResources(resources, filters), [filters, resources])
  const activeFilters = hasActiveResourceFilters(filters)

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

  const openCreateDialog = () => {
    setSelectedResource(null)
    setDialogOpen(true)
  }

  const openEditDialog = (resource: FacilityResource) => {
    setSelectedResource(resource)
    setDialogOpen(true)
  }

  const saveResource = async (input: ResourceInput) => {
    if (selectedResource) {
      await updateResource(selectedResource.id, input)
      setFeedback({ tone: "success", message: `${input.name} güncellendi.` })
    } else {
      await createResource(input)
      setFeedback({ tone: "success", message: `${input.name} kataloğa eklendi.` })
    }
  }

  const toggleResource = async (resource: FacilityResource) => {
    setTransitioningResourceId(resource.id)
    setFeedback(null)
    try {
      await setResourceActive(resource.id, !resource.isActive)
      setFeedback({
        tone: "success",
        message: `${resource.name} ${resource.isActive ? "pasife" : "aktife"} alındı.`,
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-950">Kaynaklar</h1>
          <p className="mt-0.5 text-xs text-slate-600">Tesis toplantı odalarını ve ekipman havuzlarını yönetin.</p>
        </div>
        <Button onClick={openCreateDialog}><Plus />Yeni kaynak</Button>
      </div>

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

      <section className="rounded-lg border bg-card p-3 shadow-panel" aria-label="Kaynak filtreleri">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <FilterField label="Şirket">
            <Select
              value={filters.companyId}
              onChange={(event) => setFilters((current) => ({ ...current, companyId: event.target.value, facilityId: "all" }))}
            >
              <option value="all">Tüm şirketler</option>
              {referenceData.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Tesis">
            <Select value={filters.facilityId} onChange={(event) => setFilters((current) => ({ ...current, facilityId: event.target.value }))}>
              <option value="all">Tüm tesisler</option>
              {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Kaynak türü">
            <Select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as ResourceFilters["type"] }))}>
              <option value="all">Tüm kaynak türleri</option>
              <option value="ROOM">Toplantı odası</option>
              <option value="POOLED_EQUIPMENT">Ekipman havuzu</option>
            </Select>
          </FilterField>
          <FilterField label="Durum">
            <Select value={filters.active} onChange={(event) => setFilters((current) => ({ ...current, active: event.target.value as ResourceFilters["active"] }))}>
              <option value="all">Tüm durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </Select>
          </FilterField>
        </div>
        {activeFilters && (
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setFilters(defaultResourceFilters)}><X />Filtreleri temizle</Button>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border bg-card shadow-panel" aria-label="Kaynak kataloğu">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h2 className="text-xs font-semibold text-slate-900">Katalog kayıtları</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">{filteredResources.length}</span>
        </div>

        {filteredResources.length === 0 ? (
          <ResourceEmptyState
            filtered={resources.length > 0 && activeFilters}
            onClear={() => setFilters(defaultResourceFilters)}
            onCreate={openCreateDialog}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] table-fixed text-left text-xs">
                <thead className="border-b bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-[25%] px-3 py-2">Kaynak</th>
                    <th className="w-[17%] px-3 py-2">Tür</th>
                    <th className="w-[25%] px-3 py-2">Şirket / tesis</th>
                    <th className="w-[10%] px-3 py-2">Miktar</th>
                    <th className="w-[10%] px-3 py-2">Durum</th>
                    <th className="w-[13%] px-3 py-2 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredResources.map((resource) => (
                    <tr key={resource.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5"><p className="truncate font-semibold text-slate-900" title={resource.name}>{resource.name}</p></td>
                      <td className="px-3 py-2.5">{resourceTypeLabels[resource.type]}</td>
                      <td className="px-3 py-2.5">
                        <p className="truncate" title={resource.companyName}>{resource.companyName}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500" title={resource.facilityName}>{resource.facilityName}</p>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{formatQuantity(resource)}</td>
                      <td className="px-3 py-2.5"><ResourceStatus active={resource.isActive} /></td>
                      <td className="px-3 py-2.5"><ResourceActions resource={resource} busy={transitioningResourceId === resource.id} onEdit={openEditDialog} onToggle={toggleResource} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y md:hidden">
              {filteredResources.map((resource) => (
                <article key={resource.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900">{resource.name}</h3>
                      <p className="mt-0.5 text-xs text-slate-600">{resourceTypeLabels[resource.type]}</p>
                    </div>
                    <ResourceStatus active={resource.isActive} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div><dt className="text-slate-500">Şirket</dt><dd className="mt-0.5 font-medium text-slate-800">{resource.companyName}</dd></div>
                    <div><dt className="text-slate-500">Tesis</dt><dd className="mt-0.5 font-medium text-slate-800">{resource.facilityName}</dd></div>
                    <div><dt className="text-slate-500">Miktar</dt><dd className="mt-0.5 font-medium tabular-nums text-slate-800">{formatQuantity(resource)}</dd></div>
                  </dl>
                  <div className="mt-3 border-t pt-2"><ResourceActions resource={resource} busy={transitioningResourceId === resource.id} onEdit={openEditDialog} onToggle={toggleResource} /></div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <ResourceFormDialog
        open={dialogOpen}
        resource={selectedResource}
        referenceData={referenceData}
        onOpenChange={setDialogOpen}
        onSave={saveResource}
      />
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1 block text-[11px] font-medium text-slate-600">{label}</span>{children}</label>
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

function ResourceActions({ resource, busy, onEdit, onToggle }: {
  resource: FacilityResource
  busy: boolean
  onEdit(resource: FacilityResource): void
  onToggle(resource: FacilityResource): Promise<void>
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={() => onEdit(resource)} aria-label={`${resource.name} kaynağını düzenle`}><Pencil />Düzenle</Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void onToggle(resource)} aria-label={`${resource.name} kaynağını ${resource.isActive ? "pasife" : "aktife"} al`}>
        {resource.isActive ? <PowerOff /> : <Power />}{resource.isActive ? "Pasife al" : "Aktife al"}
      </Button>
    </div>
  )
}

function ResourceEmptyState({ filtered, onClear, onCreate }: { filtered: boolean; onClear(): void; onCreate(): void }) {
  return (
    <div className="px-4 py-14 text-center">
      <Boxes className="mx-auto size-8 text-slate-400" />
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{filtered ? "Filtrelerle eşleşen kaynak yok" : "Kaynak kataloğu boş"}</h3>
      <p className="mt-1 text-xs text-slate-600">{filtered ? "Filtreleri değiştirerek yeniden deneyin." : "İlk toplantı odasını veya ekipman havuzunu ekleyin."}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={filtered ? onClear : onCreate}>{filtered ? "Filtreleri temizle" : "Yeni kaynak"}</Button>
    </div>
  )
}

function formatQuantity(resource: FacilityResource) {
  return resource.type === "ROOM" ? "—" : resource.totalQuantity
}

function ResourceCatalogSkeleton() {
  return (
    <div className="space-y-3" aria-label="Kaynak kataloğu yükleniyor" role="status">
      <div className="flex items-center justify-between"><div className="h-6 w-32 animate-pulse rounded bg-slate-200" /><div className="h-8 w-28 animate-pulse rounded bg-slate-200" /></div>
      <div className="grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded bg-slate-100" />)}
      </div>
      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="h-9 animate-pulse border-b bg-slate-100" />
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-12 animate-pulse border-b bg-white p-3"><div className="h-full rounded bg-slate-100" /></div>)}
      </div>
    </div>
  )
}
