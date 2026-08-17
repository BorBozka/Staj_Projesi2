import { zodResolver } from "@hookform/resolvers/zod"
import { isAfter, isSameDay } from "date-fns"
import { CarFront, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ClipboardList, UserRound } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { PlannedTransportAssignment, TransportAvailability } from "@/domain/transport-assignments"
import { TransportAssignmentDetailsDialog } from "@/features/transport/TransportAssignmentDetailsDialog"
import { TransportAvailabilityPicker } from "@/features/transport/TransportAvailabilityPicker"
import { transportAssignmentFormSchema, type TransportAssignmentFormValues } from "@/features/transport/transport-assignment-form-schema"
import {
  getTransportPageCount,
  getVisibleTransportPageNumbers,
  paginateTransportAssignments,
  TRANSPORT_PAGE_SIZE,
} from "@/features/transport/transport-assignment-pagination"
import { buildTransportAvailabilityInput, formatTransportAssignmentSchedule } from "@/features/transport/transport-assignment-time"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"
import { transportAssignmentService } from "@/services"

const emptyForm: TransportAssignmentFormValues = {
  companyId: "",
  facilityId: "",
  date: "",
  startTime: "",
  endTime: "",
  purpose: "",
  vehicleResourceId: "",
  driverResourceId: "",
  relatedKind: "none",
  relatedId: "",
}

export function TransportPlanningPage() {
  const { meetings, visits, referenceData } = useVisits()
  const [availability, setAvailability] = useState<TransportAvailability | null>(null)
  const [assignments, setAssignments] = useState<PlannedTransportAssignment[]>([])
  const [page, setPage] = useState(1)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false)
  const [viewingAssignment, setViewingAssignment] = useState<PlannedTransportAssignment | null>(null)
  const { register, watch, setValue, reset, handleSubmit, formState: { errors, isSubmitting } } = useForm<TransportAssignmentFormValues>({
    resolver: zodResolver(transportAssignmentFormSchema),
    defaultValues: emptyForm,
  })

  const companyId = watch("companyId")
  const facilityId = watch("facilityId")
  const date = watch("date")
  const startTime = watch("startTime")
  const endTime = watch("endTime")
  const vehicleResourceId = watch("vehicleResourceId")
  const driverResourceId = watch("driverResourceId")
  const relatedKind = watch("relatedKind")
  const planningContext = useMemo(
    () => buildTransportAvailabilityInput(companyId, facilityId, date, startTime, endTime),
    [companyId, date, endTime, facilityId, startTime],
  )

  useEffect(() => {
    let cancelled = false
    if (!planningContext) {
      setAvailability(null)
      setAvailabilityError(null)
      return
    }

    setIsAvailabilityLoading(true)
    setAvailabilityError(null)
    void transportAssignmentService.getAvailability(planningContext)
      .then((nextAvailability) => {
        if (cancelled) return
        setAvailability(nextAvailability)
        if (!nextAvailability.vehicles.some((resource) => resource.id === vehicleResourceId)) setValue("vehicleResourceId", "")
        if (!nextAvailability.drivers.some((resource) => resource.id === driverResourceId)) setValue("driverResourceId", "")
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAvailability(null)
          setAvailabilityError(error instanceof Error ? error.message : "Müsaitlik yüklenemedi.")
        }
      })
      .finally(() => !cancelled && setIsAvailabilityLoading(false))
    return () => { cancelled = true }
  }, [driverResourceId, planningContext, setValue, vehicleResourceId])

  useEffect(() => {
    let cancelled = false
    void transportAssignmentService.listAssignments().then((nextAssignments) => { if (!cancelled) setAssignments(nextAssignments) })
    return () => { cancelled = true }
  }, [])

  const facilities = useMemo(() => referenceData?.facilities.filter((facility) => facility.companyId === companyId) ?? [], [companyId, referenceData])
  const relatedRecords = useMemo(() => {
    if (relatedKind === "meeting") return meetings.filter((meeting) => meeting.hostCompanyId === companyId && meeting.facilityId === facilityId).map((meeting) => ({ id: meeting.id, label: `${formatTr(new Date(meeting.plannedStart), "d MMM HH:mm")} · ${meeting.hostEmployeeName}` }))
    if (relatedKind === "visit") return visits.filter((visit) => visit.hostCompanyId === companyId && visit.facilityId === facilityId).map((visit) => ({ id: visit.id, label: `${visit.visitor.firstName} ${visit.visitor.lastName} · ${formatTr(new Date(visit.plannedStart), "d MMM HH:mm")}` }))
    return []
  }, [companyId, facilityId, meetings, relatedKind, visits])
  const allVisibleAssignments = useMemo(() => {
    const current = new Date()
    const scoped = assignments.filter((assignment) =>
      (!companyId || assignment.companyId === companyId)
      && (!facilityId || assignment.facilityId === facilityId),
    )
    if (date && facilityId && companyId) return scoped.filter((assignment) => isSameDay(new Date(assignment.plannedStart), new Date(`${date}T12:00:00`)))
    return scoped.filter((assignment) => assignment.status === "ACTIVE" && isAfter(new Date(assignment.plannedStart), current))
  }, [assignments, companyId, date, facilityId])
  const pageCount = getTransportPageCount(allVisibleAssignments.length)
  const visibleAssignments = paginateTransportAssignments(allVisibleAssignments, page)
  const visibleStart = allVisibleAssignments.length === 0 ? 0 : (page - 1) * TRANSPORT_PAGE_SIZE + 1
  const visibleEnd = Math.min(page * TRANSPORT_PAGE_SIZE, allVisibleAssignments.length)

  useEffect(() => {
    setPage(1)
  }, [companyId, date, facilityId])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const onSubmit = async (values: TransportAssignmentFormValues) => {
    const input = buildTransportAvailabilityInput(values.companyId, values.facilityId, values.date, values.startTime, values.endTime)
    if (!input) return
    setSaveError(null)
    const request = {
      ...input,
      purpose: values.purpose,
      vehicleResourceId: values.vehicleResourceId,
      driverResourceId: values.driverResourceId,
      ...(values.relatedKind === "meeting" ? { relatedMeetingId: values.relatedId } : {}),
      ...(values.relatedKind === "visit" ? { relatedVisitId: values.relatedId } : {}),
    }
    try {
      const saved = await transportAssignmentService.createAssignment(request)
      setAssignments((current) => [...current, saved].sort((a, b) => a.plannedStart.localeCompare(b.plannedStart)))
      reset({ ...emptyForm, companyId: values.companyId, facilityId: values.facilityId, date: values.date })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Planlı atama kaydedilemedi.")
    }
  }

  const companyField = register("companyId")
  const facilityField = register("facilityId")
  const relatedKindField = register("relatedKind")

  return <>
    <h1 className="sr-only">ARAÇ VE ŞOFÖR PLANI</h1>
    <div className="min-w-0 -mt-1 -mb-3 space-y-2 md:space-y-2.5">
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-3 py-2.5"><p className="text-sm font-semibold text-slate-900">ARAÇ VE ŞOFÖR PLANI</p></div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Şirket" error={errors.companyId?.message}><Select {...companyField} onChange={(event) => { companyField.onChange(event); setValue("facilityId", ""); setValue("vehicleResourceId", ""); setValue("driverResourceId", "") }}><option value="" disabled hidden>Şirket seçin</option>{referenceData?.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select></Field>
          <Field label="Tesis" error={errors.facilityId?.message}><Select {...facilityField} disabled={!companyId} onChange={(event) => { facilityField.onChange(event); setValue("vehicleResourceId", ""); setValue("driverResourceId", "") }}><option value="" disabled hidden>Tesis seçin</option>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</Select></Field>
          <Field label="Tarih" error={errors.date?.message}><Input type="date" {...register("date")} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Başlangıç (opsiyonel)" error={errors.startTime?.message}><Input type="time" {...register("startTime")} /></Field><Field label="Bitiş (opsiyonel)" error={errors.endTime?.message}><Input type="time" {...register("endTime")} /></Field></div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Field label="Görev / amaç" error={errors.purpose?.message}><Input placeholder="Örn. Tedarikçi saha ziyareti" {...register("purpose")} /></Field>
          <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]"><Field label="İlgili kayıt"><Select {...relatedKindField} onChange={(event) => { relatedKindField.onChange(event); setValue("relatedId", "") }}><option value="none">Bağlantı yok</option><option value="visit">Ziyaret</option><option value="meeting">Toplantı</option></Select></Field>{relatedKind !== "none" && <Field label="Kayıt seçimi" error={errors.relatedId?.message}><Select {...register("relatedId")}><option value="" disabled hidden>İlgili kaydı seçin</option>{relatedRecords.map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}</Select></Field>}</div>
        </div>
        {(saveError || availabilityError) && <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{saveError ?? availabilityError}</p>}
        <div className="mt-4 grid gap-3 lg:grid-cols-2"><TransportAvailabilityPicker title="Müsait araçlar" icon={<CarFront className="size-4" />} ready={Boolean(planningContext)} loading={isAvailabilityLoading} selectedId={vehicleResourceId} onSelect={(id) => setValue("vehicleResourceId", id, { shouldValidate: true })} items={availability?.vehicles.map((vehicle) => ({ id: vehicle.id, title: `${vehicle.brand} ${vehicle.model}`, detail: vehicle.licensePlate })) ?? []} /><TransportAvailabilityPicker title="Müsait şoförler" icon={<UserRound className="size-4" />} ready={Boolean(planningContext)} loading={isAvailabilityLoading} selectedId={driverResourceId} onSelect={(id) => setValue("driverResourceId", id, { shouldValidate: true })} items={availability?.drivers.map((driver) => ({ id: driver.id, title: driver.fullName, detail: driver.licenseClasses.join(", ") })) ?? []} /></div>
        {(errors.vehicleResourceId || errors.driverResourceId) && <p className="mt-2 text-xs font-medium text-red-600">{errors.vehicleResourceId?.message ?? errors.driverResourceId?.message}</p>}
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3"><Button type="submit" disabled={isSubmitting || !availability}><ClipboardList />{isSubmitting ? "Kaydediliyor…" : "Planlı atama oluştur"}</Button></div>
      </form>
    </div>
    <div className="scroll-mt-3 flex h-[20rem] min-h-[20rem] flex-col overflow-hidden rounded-lg border bg-card shadow-panel">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        {visibleAssignments.length === 0 ? <p className="flex h-full items-center justify-center px-3 text-center text-sm text-slate-500">{date && companyId && facilityId ? "Seçili tarih ve tesis için planlı atama yok." : "Yaklaşan aktif atama yok."}</p> : <table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b bg-slate-50 text-[11px] font-medium text-slate-500"><tr><th className="px-3 py-2.5">Tarih / saat</th><th className="px-3 py-2.5">Araç</th><th className="px-3 py-2.5">Şoför</th><th className="px-3 py-2.5">Görev / amaç</th><th className="px-3 py-2.5">DURUM</th></tr></thead><tbody className="divide-y">{visibleAssignments.map((assignment) => <tr key={assignment.id} role="button" tabIndex={0} aria-label={`${assignment.vehicleName} ${assignment.vehicleLicensePlate} araç görevi detaylarını aç`} className={cn("group cursor-pointer text-slate-700 transition-colors hover:bg-blue-50/60 focus-visible:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600", assignment.status === "CANCELLED" && "bg-slate-50 text-slate-400 hover:bg-slate-100 focus-visible:bg-slate-100")} onClick={() => setViewingAssignment(assignment)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setViewingAssignment(assignment) } }}><td className="whitespace-nowrap px-3 py-2.5 font-medium">{formatTransportAssignmentSchedule(assignment)}</td><td className="px-3 py-2.5"><p className="font-medium text-slate-900 transition-colors group-hover:text-blue-800 group-focus-visible:text-blue-800">{assignment.vehicleName}</p><p className="mt-0.5 text-slate-500">{assignment.vehicleLicensePlate}</p></td><td className="px-3 py-2.5 font-medium text-slate-900">{assignment.driverName}</td><td className="px-3 py-2.5">{assignment.purpose}</td><td className="px-3 py-2.5"><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">Planlı</span></td></tr>)}{Array.from({ length: Math.max(0, TRANSPORT_PAGE_SIZE - visibleAssignments.length) }).map((_, index) => <tr key={`filler-${index}`} aria-hidden="true" className={cn("pointer-events-none select-none", index > 0 && "border-transparent")}><td className="px-3 py-2.5"><p className="font-medium text-transparent">&nbsp;</p><p className="mt-0.5 text-[11px] text-transparent">&nbsp;</p></td><td className="px-3 py-2.5 text-transparent">&nbsp;</td><td className="px-3 py-2.5 text-transparent">&nbsp;</td><td className="px-3 py-2.5 text-transparent">&nbsp;</td><td className="px-3 py-2.5 text-transparent">&nbsp;</td></tr>)}</tbody></table>}
      </div>
    <div className="flex flex-col gap-2 border-t bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs tabular-nums text-slate-600">{visibleStart}–{visibleEnd} / {allVisibleAssignments.length} kayıt</p>
      <nav className="flex items-center gap-1" aria-label="Planlı atama sayfaları">
        <span className="flex w-[68px] shrink-0 justify-end gap-1">{page > 1 && <>
          <Button type="button" variant="outline" size="icon-sm" className="h-8 w-8 text-xs" onClick={() => setPage(1)} title="İlk sayfa" aria-label="İlk sayfa"><ChevronsLeft className="size-4" /></Button>
          <Button type="button" variant="outline" size="icon-sm" className="h-8 w-8 text-xs" onClick={() => setPage(page - 1)} title="Önceki sayfa" aria-label="Önceki sayfa"><ChevronLeft className="size-4" /></Button>
        </>}</span>
        {getVisibleTransportPageNumbers(page, pageCount).map((pageNumber) => <Button key={pageNumber} type="button" variant={pageNumber === page ? "default" : "outline"} size="icon-sm" className="h-8 w-8 text-xs" aria-current={pageNumber === page ? "page" : undefined} aria-label={`${pageNumber}. sayfa`} onClick={() => setPage(pageNumber)}>{pageNumber}</Button>)}
        <span className="flex w-[68px] shrink-0 gap-1">{page < pageCount && <>
          <Button type="button" variant="outline" size="icon-sm" className="h-8 w-8 text-xs" onClick={() => setPage(page + 1)} title="Sonraki sayfa" aria-label="Sonraki sayfa"><ChevronRight className="size-4" /></Button>
          <Button type="button" variant="outline" size="icon-sm" className="h-8 w-8 text-xs" onClick={() => setPage(pageCount)} title="Son sayfa" aria-label="Son sayfa"><ChevronsRight className="size-4" /></Button>
        </>}</span>
      </nav>
    </div>
    </div>
    <TransportAssignmentDetailsDialog
      assignment={viewingAssignment}
      open={Boolean(viewingAssignment)}
      onOpenChange={(open) => !open && setViewingAssignment(null)}
      onUpdated={(updated) => {
        setAssignments((current) => current.map((assignment) => assignment.id === updated.id ? updated : assignment))
        setViewingAssignment(updated)
      }}
      onCancelled={(cancelled) => {
        setAssignments((current) => current.map((assignment) => assignment.id === cancelled.id ? cancelled : assignment))
        setViewingAssignment(cancelled)
      }}
    />
    </div>
  </>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs font-medium text-slate-700">{label}</Label>{children}{error && <p className="text-[11px] font-medium text-red-600">{error}</p>}</div>
}
