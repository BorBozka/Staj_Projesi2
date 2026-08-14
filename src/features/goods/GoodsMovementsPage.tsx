import { zodResolver } from "@hookform/resolvers/zod"
import { startOfDay, endOfDay } from "date-fns"
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpFromLine, ChevronDown, FilterX, Pencil, Plus, Search, XCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, InternalDialogContent } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getGoodsCompletionLabel, getGoodsCounterpartyLabel, getGoodsDirectionLabel, getGoodsMovementDisplayStatus, type GoodsMovement, type GoodsMovementDirection, type GoodsMovementInput } from "@/domain/goods-movements"
import { goodsMovementFormSchema, type GoodsMovementFormValues } from "@/features/goods/goods-movement-form-schema"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"
import { goodsMovementService } from "@/services"

const empty = { direction: "", companyId: "", facilityId: "", plannedDate: "", plannedTime: "", counterpartyName: "", goodsDescription: "", referenceNumber: "", note: "" } as unknown as GoodsMovementFormValues
type Filters = { query: string; from: string; to: string; companyId: string; facilityId: string; direction: "all" | GoodsMovementDirection; status: "all" | "PLANNED" | "COMPLETED" | "CANCELLED" | "LATE" }
type SortField = "direction" | "counterparty" | "goods" | "companyFacility" | "plannedAt" | "actualAt" | "status"
type Sort = { field: SortField; direction: "asc" | "desc" }
const initialFilters: Filters = { query: "", from: "", to: "", companyId: "all", facilityId: "all", direction: "all", status: "all" }

export function GoodsMovementsPage() {
  const { referenceData, isLoading } = useVisits(); const [movements, setMovements] = useState<GoodsMovement[]>([]); const [filters, setFilters] = useState<Filters>(initialFilters); const [sorts, setSorts] = useState<Sort[]>([]); const [editing, setEditing] = useState<GoodsMovement | null>(null); const [viewing, setViewing] = useState<GoodsMovement | null>(null); const [formOpen, setFormOpen] = useState(false); const [error, setError] = useState<string | null>(null)
  const load = () => void goodsMovementService.listGoodsMovements().then(setMovements); useEffect(load, [])
  const facilities = useMemo(() => referenceData?.facilities.filter((item) => filters.companyId === "all" || item.companyId === filters.companyId) ?? [], [filters.companyId, referenceData])
  const rows = useMemo(() => sortGoodsMovements(movements.filter((item) => { const status = getGoodsMovementDisplayStatus(item); const text = `${item.counterpartyName} ${item.goodsDescription} ${item.companyName} ${item.facilityName}`.toLocaleLowerCase("tr-TR"); const planned = new Date(`${item.plannedDate}T12:00:00`); return (!filters.query || text.includes(filters.query.toLocaleLowerCase("tr-TR"))) && (filters.companyId === "all" || item.companyId === filters.companyId) && (filters.facilityId === "all" || item.facilityId === filters.facilityId) && (filters.direction === "all" || item.direction === filters.direction) && (filters.status === "all" || status === filters.status) && (!filters.from || planned >= startOfDay(new Date(`${filters.from}T12:00:00`))) && (!filters.to || planned <= endOfDay(new Date(`${filters.to}T12:00:00`))) }), sorts), [filters, movements, sorts])
  if (isLoading || !referenceData) return <div className="h-64 animate-pulse rounded-lg border bg-slate-100" />
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((current) => ({ ...current, [key]: value }))
  const activeFilters = Boolean(filters.query.trim() || filters.from || filters.to || filters.companyId !== "all" || filters.facilityId !== "all" || filters.direction !== "all" || filters.status !== "all" || sorts.length > 0)
  const cancel = async (item: GoodsMovement) => { try { const saved = await goodsMovementService.cancelGoodsMovement(item.id); setMovements((current) => current.map((row) => row.id === saved.id ? saved : row)); setViewing(null) } catch (e) { setError(e instanceof Error ? e.message : "Kayıt iptal edilemedi.") } }
  return (
    <>
      <h1 className="sr-only">Mal Giriş / Çıkış</h1>
      <div className="min-w-0 space-y-3 md:space-y-3.5">
      <section className="rounded-lg border bg-card p-3 shadow-panel" aria-label="Mal hareketi filtreleri">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">MAL HAREKETİ FİLTRELERİ</span>
          {activeFilters && <Button type="button" variant="ghost" size="sm" className="h-5 gap-1 border-none px-1 text-[11px] font-medium text-slate-500 shadow-none hover:bg-transparent hover:text-slate-900" onClick={() => { setFilters(initialFilters); setSorts([]) }}><FilterX className="size-3 text-slate-500" />Filtreleri temizle</Button>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1.5fr)_repeat(6,minmax(120px,1fr))_auto]">
          <FilterField label="Arama" htmlFor="goods-search" className="sm:col-span-2 xl:col-span-1"><div className="relative"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="goods-search" value={filters.query} onChange={(event) => update("query", event.target.value)} placeholder="Mal, karşı firma, şirket veya tesis ara" className="h-9 pl-8 text-xs" /></div></FilterField>
          <FilterField label="Başlangıç" htmlFor="goods-from"><Input id="goods-from" type="date" value={filters.from} onChange={(event) => update("from", event.target.value)} className="h-9 text-xs" /></FilterField>
          <FilterField label="Bitiş" htmlFor="goods-to"><Input id="goods-to" type="date" value={filters.to} onChange={(event) => update("to", event.target.value)} className="h-9 text-xs" /></FilterField>
          <FilterField label="Şirket" htmlFor="goods-company"><FilterSelect id="goods-company" value={filters.companyId} emptyLabel="Tüm şirketler" options={referenceData.companies.map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => { update("companyId", value); update("facilityId", "all") }} /></FilterField>
          <FilterField label="Tesis" htmlFor="goods-facility"><FilterSelect id="goods-facility" value={filters.facilityId} emptyLabel="Tüm tesisler" options={facilities.map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => update("facilityId", value)} /></FilterField>
          <FilterField label="Yön" htmlFor="goods-direction"><FilterSelect id="goods-direction" value={filters.direction} emptyLabel="Tüm yönler" options={[{ value: "INBOUND", label: "Gelen" }, { value: "OUTBOUND", label: "Giden" }]} onValueChange={(value) => update("direction", value as Filters["direction"])} /></FilterField>
          <FilterField label="Durum" htmlFor="goods-status"><FilterSelect id="goods-status" value={filters.status} emptyLabel="Tüm durumlar" options={[{ value: "PLANNED", label: "Planlı" }, { value: "LATE", label: "Gecikti" }, { value: "COMPLETED", label: "Tamamlandı" }, { value: "CANCELLED", label: "İptal" }]} onValueChange={(value) => update("status", value as Filters["status"])} /></FilterField>
          <div className="flex flex-col justify-end"><Button type="button" className="h-9 w-full gap-1 text-xs" onClick={() => { setEditing(null); setError(null); setFormOpen(true) }}><Plus className="size-3.5" />Yeni kayıt</Button></div>
        </div>
      </section>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <section className="overflow-hidden rounded-lg border bg-white shadow-panel" aria-label="Mal hareketleri">
        <div className="flex items-center justify-between border-b px-3 py-2.5"><p className="text-sm font-semibold">Mal hareketleri</p><span className="text-xs font-medium text-slate-500">{rows.length} kayıt</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-xs"><thead className="bg-slate-50 text-[11px] font-semibold text-slate-500"><tr><th className="px-3 py-2.5"><SortButton label="YÖN" field="direction" sorts={sorts} onToggle={(field) => setSorts((current) => toggleGoodsSort(current, field))} /></th><th className="px-3 py-2.5"><SortButton label="KARŞI FİRMA" field="counterparty" sorts={sorts} onToggle={(field) => setSorts((current) => toggleGoodsSort(current, field))} /></th><th className="px-3 py-2.5"><SortButton label="MAL / AÇIKLAMA" field="goods" sorts={sorts} onToggle={(field) => setSorts((current) => toggleGoodsSort(current, field))} /></th><th className="px-3 py-2.5"><SortButton label="ŞİRKET / TESİS" field="companyFacility" sorts={sorts} onToggle={(field) => setSorts((current) => toggleGoodsSort(current, field))} /></th><th className="px-3 py-2.5"><SortButton label="PLANLANAN ZAMAN" field="plannedAt" sorts={sorts} onToggle={(field) => setSorts((current) => toggleGoodsSort(current, field))} /></th><th className="px-3 py-2.5"><SortButton label="GERÇEKLEŞEN ZAMAN" field="actualAt" sorts={sorts} onToggle={(field) => setSorts((current) => toggleGoodsSort(current, field))} /></th><th className="px-3 py-2.5"><SortButton label="DURUM" field="status" sorts={sorts} onToggle={(field) => setSorts((current) => toggleGoodsSort(current, field))} /></th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((item) => <tr key={item.id} role="button" tabIndex={0} className="cursor-pointer transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600" onClick={() => setViewing(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setViewing(item) } }}><td className="px-3 py-2.5"><Direction direction={item.direction} /></td><td className="px-3 py-2.5 font-medium">{item.counterpartyName}</td><td className="px-3 py-2.5">{item.goodsDescription}</td><td className="px-3 py-2.5"><p>{item.companyName}</p><p className="text-slate-500">{item.facilityName}</p></td><td className="whitespace-nowrap px-3 py-2.5">{formatPlanned(item)}</td><td className="whitespace-nowrap px-3 py-2.5">{item.actualAt ? formatTr(new Date(item.actualAt), "d MMM HH:mm") : "—"}</td><td className="px-3 py-2.5"><Status movement={item} /></td></tr>)}{rows.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-slate-500">Bu filtreler için kayıt yok.</td></tr>}</tbody></table></div>
      </section>
      <GoodsForm open={formOpen} movement={editing} references={referenceData} onOpenChange={setFormOpen} onSave={(saved) => { setMovements((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]); setFormOpen(false) }} />
      <Details movement={viewing} onOpenChange={(open) => !open && setViewing(null)} onEdit={(item) => { setViewing(null); setEditing(item); setFormOpen(true) }} onCancel={cancel} />
      </div>
    </>
  )
}
function FilterField({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: React.ReactNode }) { return <div className={className}><label id={`${htmlFor}-label`} htmlFor={htmlFor} className="mb-1 block text-[11px] font-medium text-slate-600">{label}</label>{children}</div> }

function FilterSelect({ id, value, emptyLabel, options, onValueChange }: { id: string; value: string; emptyLabel: string; options: { value: string; label: string }[]; onValueChange(value: string): void }) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? emptyLabel
  return <DropdownMenu><DropdownMenuTrigger asChild><Button id={id} variant="outline" className="h-9 w-full justify-between px-3 text-left text-xs font-normal" aria-labelledby={`${id}-label ${id}`}><span className="truncate">{selectedLabel}</span><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="max-h-64 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"><DropdownMenuRadioGroup value={value === "all" ? "" : value} onValueChange={onValueChange}>{options.map((option) => <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
}

function SortButton({ label, field, sorts, onToggle }: { label: string; field: SortField; sorts: Sort[]; onToggle(field: SortField): void }) { const activeSort = sorts.find((sort) => sort.field === field); return <button type="button" className="inline-flex items-center gap-1 rounded-sm hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => onToggle(field)} aria-label={`${label} sütununu sırala`} aria-pressed={Boolean(activeSort)}>{label}{activeSort ? activeSort.direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button> }

function toggleGoodsSort(sorts: Sort[], field: SortField): Sort[] { const existing = sorts.find((sort) => sort.field === field); if (!existing) return [...sorts, { field, direction: "asc" }]; if (existing.direction === "asc") return sorts.map((sort) => sort.field === field ? { ...sort, direction: "desc" } : sort); return sorts.filter((sort) => sort.field !== field) }

function sortGoodsMovements(movements: GoodsMovement[], sorts: Sort[]): GoodsMovement[] { if (sorts.length === 0) return movements; return [...movements].sort((left, right) => { for (const sort of sorts) { const result = compareGoodsMovements(left, right, sort.field); if (result !== 0) return sort.direction === "asc" ? result : -result } return 0 }) }

function compareGoodsMovements(left: GoodsMovement, right: GoodsMovement, field: SortField): number { const leftValue = goodsSortValue(left, field); const rightValue = goodsSortValue(right, field); if (typeof leftValue === "number" && typeof rightValue === "number") return leftValue - rightValue; return String(leftValue).localeCompare(String(rightValue), "tr-TR", { sensitivity: "base" }) }

function goodsSortValue(movement: GoodsMovement, field: SortField): number | string { if (field === "plannedAt") return `${movement.plannedDate}${movement.plannedTime ?? ""}`; if (field === "actualAt") return movement.actualAt ? new Date(movement.actualAt).getTime() : Number.POSITIVE_INFINITY; if (field === "direction") return getGoodsDirectionLabel(movement.direction); if (field === "counterparty") return movement.counterpartyName; if (field === "goods") return movement.goodsDescription; if (field === "companyFacility") return `${movement.companyName} ${movement.facilityName}`; return getGoodsMovementDisplayStatus(movement) }

function Direction({ direction }: { direction: GoodsMovementDirection }) { const Icon = direction === "INBOUND" ? ArrowDownToLine : ArrowUpFromLine; return <span className="inline-flex items-center gap-1 font-medium"><Icon className={cn("size-3.5", direction === "INBOUND" ? "text-emerald-700" : "text-blue-700")} />{getGoodsDirectionLabel(direction)}</span> }
function Status({ movement }: { movement: GoodsMovement }) { const status = getGoodsMovementDisplayStatus(movement); const labels = { PLANNED: "Planlı", LATE: "Gecikti", COMPLETED: getGoodsCompletionLabel(movement.direction), CANCELLED: "İptal" }; return <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", status === "LATE" ? "bg-amber-50 text-amber-700" : status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : status === "CANCELLED" ? "bg-slate-200 text-slate-600" : "bg-blue-50 text-blue-700")}>{labels[status]}</span> }
function formatPlanned(movement: GoodsMovement, pattern = "d MMM") { return `${formatTr(new Date(`${movement.plannedDate}T12:00:00`), pattern)} · ${movement.plannedTime ?? "Saat belirtilmedi"}` }
function GoodsForm({ open, movement, references, onOpenChange, onSave }: { open: boolean; movement: GoodsMovement | null; references: { companies: { id: string; name: string }[]; facilities: { id: string; name: string; companyId: string }[] }; onOpenChange(open: boolean): void; onSave(movement: GoodsMovement): void }) {
  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<GoodsMovementFormValues>({ resolver: zodResolver(goodsMovementFormSchema), values: movement ? { direction: movement.direction, companyId: movement.companyId, facilityId: movement.facilityId, plannedDate: movement.plannedDate, plannedTime: movement.plannedTime ?? "", counterpartyName: movement.counterpartyName, goodsDescription: movement.goodsDescription, referenceNumber: movement.referenceNumber ?? "", note: movement.note ?? "" } : empty })
  const direction = watch("direction")
  const companyId = watch("companyId")
  const company = register("companyId")
  const facilities = references.facilities.filter((item) => item.companyId === companyId)
  const submit = async (values: GoodsMovementFormValues) => {
    const input: GoodsMovementInput = { ...values, plannedTime: values.plannedTime || undefined }
    const saved = movement ? await goodsMovementService.updateGoodsMovement(movement.id, input) : await goodsMovementService.createGoodsMovement(input)
    onSave(saved)
    reset(empty)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <InternalDialogContent className="!max-h-[85vh] !w-[min(680px,calc(100vw-2rem))] !max-w-none flex flex-col gap-0 overflow-hidden p-0" aria-describedby={undefined}>
        <DialogHeader className="shrink-0 border-b bg-white px-5 pb-3 pt-4 pr-12">
          <DialogTitle className="text-lg font-semibold text-slate-900">{movement ? "Mal hareketini düzenle" : "Yeni mal hareketi"}</DialogTitle>
        </DialogHeader>
        <form id="goods-movement-form" className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)} noValidate>
          <Field label="Yön" required error={errors.direction?.message}><Select {...register("direction")}><option value="" disabled hidden>Yön seçin</option><option value="INBOUND">Gelen</option><option value="OUTBOUND">Giden</option></Select></Field>
          <Field label="Planlanan tarih" required error={errors.plannedDate?.message}><Input type="date" {...register("plannedDate")} /></Field>
          <Field label="Şirket" required error={errors.companyId?.message}><Select {...company} onChange={(event) => { void company.onChange(event); setValue("facilityId", "", { shouldDirty: true, shouldValidate: true }) }}><option value="" disabled hidden>Şirket seçin</option>{references.companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Tesis" required error={errors.facilityId?.message}><Select {...register("facilityId")} disabled={!companyId}><option value="" disabled hidden>Tesis seçin</option>{facilities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label={direction ? getGoodsCounterpartyLabel(direction) : "Karşı firma"} required error={errors.counterpartyName?.message}><Input {...register("counterpartyName")} /></Field>
          <Field label="Mal / açıklama" required error={errors.goodsDescription?.message}><Input {...register("goodsDescription")} /></Field>
          <Field label="Referans no"><Input {...register("referenceNumber")} /></Field>
          <Field label="Saat (opsiyonel)"><Input type="time" {...register("plannedTime")} /></Field>
          <Field label="Not (opsiyonel)" className="sm:col-span-2"><Textarea rows={1} className="h-9 min-h-9 max-h-24 resize-none overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:w-0" {...register("note")} onInput={(event) => { event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 96)}px` }} /></Field>
        </form>
        <DialogFooter className="shrink-0 border-t bg-card px-5 py-3 sm:items-center">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Vazgeç</Button>
          <Button disabled={isSubmitting} type="submit" form="goods-movement-form">{movement ? "Kaydet" : "Kaydı oluştur"}</Button>
        </DialogFooter>
      </InternalDialogContent>
    </Dialog>
  )
}
function Details({ movement, onOpenChange, onEdit, onCancel }: { movement: GoodsMovement | null; onOpenChange(open: boolean): void; onEdit(item: GoodsMovement): void; onCancel(item: GoodsMovement): void }) { if (!movement) return null; return <Dialog open onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Mal hareketi</DialogTitle><DialogDescription><Direction direction={movement.direction} /> · {formatPlanned(movement, "d MMMM yyyy")}</DialogDescription></DialogHeader><div className="grid gap-3 text-sm"><Detail label={getGoodsCounterpartyLabel(movement.direction)} value={movement.counterpartyName} /><Detail label="Mal / açıklama" value={movement.goodsDescription} /><Detail label="Şirket / tesis" value={`${movement.companyName} · ${movement.facilityName}`} />{movement.referenceNumber && <Detail label="Referans no" value={movement.referenceNumber} />}{movement.note && <Detail label="Not" value={movement.note} />}{movement.actualAt && <Detail label={getGoodsCompletionLabel(movement.direction)} value={formatTr(new Date(movement.actualAt), "d MMMM yyyy HH:mm")} />}</div>{movement.status === "PLANNED" && <DialogFooter><Button variant="ghost" onClick={() => onEdit(movement)}><Pencil />Düzenle</Button><Button variant="ghost" className="text-rose-700" onClick={() => onCancel(movement)}><XCircle />İptal</Button></DialogFooter>}</DialogContent></Dialog> }
function Field({ label, required, error, className, children }: { label: string; required?: boolean; error?: string; className?: string; children: React.ReactNode }) { return <div className={cn("space-y-1", className)}><Label className="text-xs">{label}{required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}</Label>{children}{error && <p className="text-xs text-red-600">{error}</p>}</div> }
function Detail({ label, value }: { label: string; value: string }) { return <p><span className="block text-xs font-medium text-slate-500">{label}</span>{value}</p> }
