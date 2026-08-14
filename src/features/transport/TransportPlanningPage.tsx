import { zodResolver } from "@hookform/resolvers/zod"
import { format, isAfter, isSameDay } from "date-fns"
import { CarFront, ClipboardList, Pencil, UserRound, XCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { PlannedTransportAssignment, TransportAvailability } from "@/domain/transport-assignments"
import { TransportAssignmentDetailsDialog } from "@/features/transport/TransportAssignmentDetailsDialog"
import { transportAssignmentFormSchema, type TransportAssignmentFormValues } from "@/features/transport/transport-assignment-form-schema"
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
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<PlannedTransportAssignment | null>(null)
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
    () => availabilityInput(companyId, facilityId, date, startTime, endTime),
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
    void transportAssignmentService.getAvailability({ ...planningContext, excludeAssignmentId: editingAssignment?.id })
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
  }, [driverResourceId, editingAssignment?.id, planningContext, setValue, vehicleResourceId])

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
  const visibleAssignments = useMemo(() => {
    const current = new Date()
    const scoped = assignments.filter((assignment) =>
      (!companyId || assignment.companyId === companyId)
      && (!facilityId || assignment.facilityId === facilityId),
    )
    if (date && facilityId && companyId) return scoped.filter((assignment) => isSameDay(new Date(assignment.plannedStart), new Date(`${date}T12:00:00`)))
    return scoped.filter((assignment) => assignment.status === "ACTIVE" && isAfter(new Date(assignment.plannedStart), current))
  }, [assignments, companyId, date, facilityId])

  const onSubmit = async (values: TransportAssignmentFormValues) => {
    const input = availabilityInput(values.companyId, values.facilityId, values.date, values.startTime, values.endTime)
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
      const saved = editingAssignment
        ? await transportAssignmentService.updateAssignment(editingAssignment.id, request)
        : await transportAssignmentService.createAssignment(request)
      setAssignments((current) => editingAssignment
        ? current.map((assignment) => assignment.id === saved.id ? saved : assignment)
        : [...current, saved].sort((a, b) => a.plannedStart.localeCompare(b.plannedStart)))
      reset({ ...emptyForm, companyId: values.companyId, facilityId: values.facilityId, date: values.date })
      setEditingAssignment(null)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Planlı atama kaydedilemedi.")
    }
  }

  const startEditing = (assignment: PlannedTransportAssignment) => {
    setSaveError(null)
    setEditingAssignment(assignment)
    reset({
      companyId: assignment.companyId,
      facilityId: assignment.facilityId,
      date: format(new Date(assignment.plannedStart), "yyyy-MM-dd"),
      startTime: format(new Date(assignment.plannedStart), "HH:mm"),
      endTime: format(new Date(assignment.plannedEnd), "HH:mm"),
      purpose: assignment.purpose,
      vehicleResourceId: assignment.vehicleResourceId,
      driverResourceId: assignment.driverResourceId,
      relatedKind: assignment.relatedMeetingId ? "meeting" : assignment.relatedVisitId ? "visit" : "none",
      relatedId: assignment.relatedMeetingId ?? assignment.relatedVisitId ?? "",
    })
  }

  const cancelAssignment = async (assignment: PlannedTransportAssignment) => {
    setSaveError(null)
    try {
      const cancelled = await transportAssignmentService.cancelAssignment(assignment.id)
      setAssignments((current) => current.map((item) => item.id === cancelled.id ? cancelled : item))
      if (editingAssignment?.id === cancelled.id) {
        setEditingAssignment(null)
        reset(emptyForm)
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Planlı atama iptal edilemedi.")
    }
  }

  const companyField = register("companyId")
  const facilityField = register("facilityId")
  const relatedKindField = register("relatedKind")
  const listTitle = date && companyId && facilityId ? "Seçilen tarihin atamaları" : "Yaklaşan planlı atamalar"

  return <>
    <h1 className="sr-only">ARAÇ VE ŞOFÖR PLANI</h1>
    <div className="min-w-0 space-y-3 md:space-y-3.5">
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-3 py-2.5"><p className="text-sm font-semibold text-slate-900">{editingAssignment ? "Planlı atamayı düzenle" : "ARAÇ VE ŞOFÖR PLANI"}</p></div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Şirket" error={errors.companyId?.message}><Select {...companyField} onChange={(event) => { companyField.onChange(event); setValue("facilityId", ""); setValue("vehicleResourceId", ""); setValue("driverResourceId", "") }}><option value="" disabled hidden>Şirket seçin</option>{referenceData?.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select></Field>
          <Field label="Tesis" error={errors.facilityId?.message}><Select {...facilityField} disabled={!companyId} onChange={(event) => { facilityField.onChange(event); setValue("vehicleResourceId", ""); setValue("driverResourceId", "") }}><option value="" disabled hidden>Tesis seçin</option>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</Select></Field>
          <Field label="Tarih" error={errors.date?.message}><Input type="date" {...register("date")} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Başlangıç" error={errors.startTime?.message}><Input type="time" {...register("startTime")} /></Field><Field label="Bitiş" error={errors.endTime?.message}><Input type="time" {...register("endTime")} /></Field></div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Field label="Görev / amaç" error={errors.purpose?.message}><Input placeholder="Örn. Tedarikçi saha ziyareti" {...register("purpose")} /></Field>
          <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]"><Field label="İlgili kayıt"><Select {...relatedKindField} onChange={(event) => { relatedKindField.onChange(event); setValue("relatedId", "") }}><option value="none">Bağlantı yok</option><option value="visit">Ziyaret</option><option value="meeting">Toplantı</option></Select></Field>{relatedKind !== "none" && <Field label="Kayıt seçimi" error={errors.relatedId?.message}><Select {...register("relatedId")}><option value="" disabled hidden>İlgili kaydı seçin</option>{relatedRecords.map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}</Select></Field>}</div>
        </div>
        {(saveError || availabilityError) && <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{saveError ?? availabilityError}</p>}
        <div className="mt-4 grid gap-3 lg:grid-cols-2"><AvailabilityPicker title="Müsait araçlar" icon={<CarFront className="size-4" />} ready={Boolean(planningContext)} loading={isAvailabilityLoading} selectedId={vehicleResourceId} onSelect={(id) => setValue("vehicleResourceId", id, { shouldValidate: true })} items={availability?.vehicles.map((vehicle) => ({ id: vehicle.id, title: `${vehicle.brand} ${vehicle.model}`, detail: vehicle.licensePlate })) ?? []} /><AvailabilityPicker title="Müsait şoförler" icon={<UserRound className="size-4" />} ready={Boolean(planningContext)} loading={isAvailabilityLoading} selectedId={driverResourceId} onSelect={(id) => setValue("driverResourceId", id, { shouldValidate: true })} items={availability?.drivers.map((driver) => ({ id: driver.id, title: driver.fullName, detail: driver.licenseClasses.join(", ") })) ?? []} /></div>
        {(errors.vehicleResourceId || errors.driverResourceId) && <p className="mt-2 text-xs font-medium text-red-600">{errors.vehicleResourceId?.message ?? errors.driverResourceId?.message}</p>}
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">{editingAssignment && <Button type="button" variant="ghost" onClick={() => { setEditingAssignment(null); reset(emptyForm) }}>Vazgeç</Button>}<Button type="submit" disabled={isSubmitting || !availability}><ClipboardList />{isSubmitting ? "Kaydediliyor…" : editingAssignment ? "Değişiklikleri kaydet" : "Planlı atama oluştur"}</Button></div>
      </form>
    </div>
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5"><p className="text-sm font-semibold text-slate-900">{listTitle}</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{visibleAssignments.length}</span></div>
      {visibleAssignments.length === 0 ? <p className="px-3 py-8 text-center text-sm text-slate-500">{date && companyId && facilityId ? "Seçili tarih ve tesis için planlı atama yok." : "Yaklaşan aktif atama yok."}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[11px] font-medium text-slate-500"><tr><th className="px-3 py-2.5">Tarih / saat</th><th className="px-3 py-2.5">Araç</th><th className="px-3 py-2.5">Şoför</th><th className="px-3 py-2.5">Görev / amaç</th><th className="px-3 py-2.5">Durum</th><th className="px-3 py-2.5"><span className="sr-only">İşlemler</span></th></tr></thead><tbody className="divide-y divide-slate-100">{visibleAssignments.map((assignment) => <tr key={assignment.id} role="button" tabIndex={0} aria-label={`${assignment.vehicleName} ${assignment.vehicleLicensePlate} araç görevi detaylarını aç`} className={cn("group cursor-pointer text-slate-700 transition-colors hover:bg-blue-50/60 focus-visible:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600", assignment.status === "CANCELLED" && "bg-slate-50 text-slate-400 hover:bg-slate-100 focus-visible:bg-slate-100")} onClick={() => setViewingAssignment(assignment)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setViewingAssignment(assignment) } }}><td className="whitespace-nowrap px-3 py-2.5 font-medium">{formatTr(new Date(assignment.plannedStart), "d MMM HH:mm")} – {formatTr(new Date(assignment.plannedEnd), "HH:mm")}</td><td className="px-3 py-2.5"><p className="font-medium text-slate-900 transition-colors group-hover:text-blue-800 group-focus-visible:text-blue-800">{assignment.vehicleName}</p><p className="mt-0.5 text-slate-500">{assignment.vehicleLicensePlate}</p></td><td className="px-3 py-2.5 font-medium text-slate-900">{assignment.driverName}</td><td className="px-3 py-2.5">{assignment.purpose}</td><td className="px-3 py-2.5"><span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", assignment.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600")}>{assignment.status === "ACTIVE" ? "Planlı" : "İptal"}</span></td><td className="px-3 py-2.5"><div className="flex justify-end gap-1.5">{assignment.status === "ACTIVE" && <><Button type="button" variant="ghost" size="sm" className="gap-1" onClick={(event) => { event.stopPropagation(); startEditing(assignment) }}><Pencil />Düzenle</Button><Button type="button" variant="ghost" size="sm" className="gap-1 text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={(event) => { event.stopPropagation(); void cancelAssignment(assignment) }}><XCircle />İptal</Button></>}</div></td></tr>)}</tbody></table></div>}
    </div>
    <TransportAssignmentDetailsDialog assignment={viewingAssignment} open={Boolean(viewingAssignment)} onOpenChange={(open) => !open && setViewingAssignment(null)} />
    </div>
  </>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs font-medium text-slate-700">{label}</Label>{children}{error && <p className="text-[11px] font-medium text-red-600">{error}</p>}</div>
}

function AvailabilityPicker({ title, icon, ready, loading, selectedId, onSelect, items }: { title: string; icon: React.ReactNode; ready: boolean; loading: boolean; selectedId: string; onSelect(id: string): void; items: { id: string; title: string; detail: string }[] }) {
  const emptyText = ready ? `Bu zaman aralığında müsait ${title === "Müsait araçlar" ? "araç" : "şoför"} yok.` : "Müsaitliği görmek için şirket, tesis, tarih ve saat aralığını seçin."
  return <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-800">{icon}{title}</div><div className="mt-2 space-y-1.5">{loading ? <p className="py-2 text-xs text-slate-500">Müsaitlik hesaplanıyor…</p> : items.length === 0 ? <p className="py-2 text-xs text-slate-500">{emptyText}</p> : items.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={cn("flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600", selectedId === item.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")}><span className="min-w-0"><span className="block truncate text-xs font-medium text-slate-900">{item.title}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.detail}</span></span><span className={cn("ml-3 shrink-0 text-[11px] font-semibold", selectedId === item.id ? "text-blue-700" : "text-slate-500")}>{selectedId === item.id ? "Seçildi" : "Seç"}</span></button>)}</div></div>
}

function availabilityInput(companyId: string, facilityId: string, date: string, startTime: string, endTime: string) {
  if (!companyId || !facilityId || !date || !startTime || !endTime || startTime >= endTime) return null
  const plannedStart = new Date(`${date}T${startTime}:00`)
  const plannedEnd = new Date(`${date}T${endTime}:00`)
  if (Number.isNaN(plannedStart.getTime()) || Number.isNaN(plannedEnd.getTime())) return null
  return { companyId, facilityId, plannedStart: plannedStart.toISOString(), plannedEnd: plannedEnd.toISOString() }
}
