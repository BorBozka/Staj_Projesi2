import { zodResolver } from "@hookform/resolvers/zod"
import { CarFront, Save, UserRound } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { PlannedTransportAssignment, TransportAvailability } from "@/domain/transport-assignments"
import {
  transportAssignmentFormSchema,
  type TransportAssignmentFormValues,
} from "@/features/transport/transport-assignment-form-schema"
import { getTransportAssignmentEditValues } from "@/features/transport/transport-assignment-edit-values"
import { buildTransportAvailabilityInput } from "@/features/transport/transport-assignment-time"
import { TransportAvailabilityPicker } from "@/features/transport/TransportAvailabilityPicker"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"
import { transportAssignmentService } from "@/services"

interface TransportAssignmentEditFormProps {
  assignment: PlannedTransportAssignment
  onCancel(): void
  onSaved(assignment: PlannedTransportAssignment): void
}

export function TransportAssignmentEditForm({ assignment, onCancel, onSaved }: TransportAssignmentEditFormProps) {
  const { meetings, visits, referenceData } = useVisits()
  const [availability, setAvailability] = useState<TransportAvailability | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false)
  const {
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TransportAssignmentFormValues>({
    resolver: zodResolver(transportAssignmentFormSchema),
    defaultValues: getTransportAssignmentEditValues(assignment),
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
    reset(getTransportAssignmentEditValues(assignment))
    setSaveError(null)
  }, [assignment, reset])

  useEffect(() => {
    let cancelled = false
    if (!planningContext) {
      setAvailability(null)
      setAvailabilityError(null)
      return
    }

    setIsAvailabilityLoading(true)
    setAvailabilityError(null)
    void transportAssignmentService.getAvailability({ ...planningContext, excludeAssignmentId: assignment.id })
      .then((nextAvailability) => {
        if (cancelled) return
        setAvailability(nextAvailability)
        if (!nextAvailability.vehicles.some((resource) => resource.id === vehicleResourceId)) setValue("vehicleResourceId", "")
        if (!nextAvailability.drivers.some((resource) => resource.id === driverResourceId)) setValue("driverResourceId", "")
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setAvailability(null)
        setAvailabilityError(error instanceof Error ? error.message : "Müsaitlik yüklenemedi.")
      })
      .finally(() => !cancelled && setIsAvailabilityLoading(false))

    return () => { cancelled = true }
  }, [assignment.id, driverResourceId, planningContext, setValue, vehicleResourceId])

  const facilities = useMemo(
    () => referenceData?.facilities.filter((facility) => facility.companyId === companyId) ?? [],
    [companyId, referenceData],
  )
  const relatedRecords = useMemo(() => {
    if (relatedKind === "meeting") {
      return meetings
        .filter((meeting) => meeting.hostCompanyId === companyId && meeting.facilityId === facilityId)
        .map((meeting) => ({ id: meeting.id, label: `${formatTr(new Date(meeting.plannedStart), "d MMM HH:mm")} · ${meeting.hostEmployeeName}` }))
    }
    if (relatedKind === "visit") {
      return visits
        .filter((visit) => visit.hostCompanyId === companyId && visit.facilityId === facilityId)
        .map((visit) => ({ id: visit.id, label: `${visit.visitor.firstName} ${visit.visitor.lastName} · ${formatTr(new Date(visit.plannedStart), "d MMM HH:mm")}` }))
    }
    return []
  }, [companyId, facilityId, meetings, relatedKind, visits])

  const saveAssignment = async (values: TransportAssignmentFormValues) => {
    const input = buildTransportAvailabilityInput(values.companyId, values.facilityId, values.date, values.startTime, values.endTime)
    if (!input) return

    setSaveError(null)
    try {
      const saved = await transportAssignmentService.updateAssignment(assignment.id, {
        ...input,
        purpose: values.purpose,
        vehicleResourceId: values.vehicleResourceId,
        driverResourceId: values.driverResourceId,
        ...(values.relatedKind === "meeting" ? { relatedMeetingId: values.relatedId } : {}),
        ...(values.relatedKind === "visit" ? { relatedVisitId: values.relatedId } : {}),
      })
      onSaved(saved)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Planlı atama güncellenemedi.")
    }
  }

  return (
    <form onSubmit={handleSubmit(saveAssignment)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 space-y-3 overflow-y-auto px-5 py-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <EditField label="Şirket" error={errors.companyId?.message}>
            <Select
              {...register("companyId")}
              onChange={(event) => {
                setValue("companyId", event.target.value)
                setValue("facilityId", "")
                setValue("vehicleResourceId", "")
                setValue("driverResourceId", "")
                setValue("relatedId", "")
              }}
            >
              <option value="" disabled hidden>Şirket seçin</option>
              {referenceData?.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </Select>
          </EditField>
          <EditField label="Tesis" error={errors.facilityId?.message}>
            <Select
              {...register("facilityId")}
              disabled={!companyId}
              onChange={(event) => {
                setValue("facilityId", event.target.value)
                setValue("vehicleResourceId", "")
                setValue("driverResourceId", "")
                setValue("relatedId", "")
              }}
            >
              <option value="" disabled hidden>Tesis seçin</option>
              {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
            </Select>
          </EditField>
          <EditField label="Tarih" error={errors.date?.message}><Input type="date" {...register("date")} /></EditField>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr]">
          <EditField label="Başlangıç (opsiyonel)" error={errors.startTime?.message}><Input type="time" {...register("startTime")} /></EditField>
          <EditField label="Bitiş (opsiyonel)" error={errors.endTime?.message}><Input type="time" {...register("endTime")} /></EditField>
          <EditField label="Görev / amaç" error={errors.purpose?.message}><Input {...register("purpose")} /></EditField>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-[180px_minmax(0,1fr)]">
          <EditField label="İlgili kayıt">
            <Select
              {...register("relatedKind")}
              onChange={(event) => {
                setValue("relatedKind", event.target.value as TransportAssignmentFormValues["relatedKind"])
                setValue("relatedId", "")
              }}
            >
              <option value="none">Bağlantı yok</option>
              <option value="visit">Ziyaret</option>
              <option value="meeting">Toplantı</option>
            </Select>
          </EditField>
          {relatedKind !== "none" && (
            <EditField label="Kayıt seçimi" error={errors.relatedId?.message}>
              <Select {...register("relatedId")}>
                <option value="" disabled hidden>İlgili kaydı seçin</option>
                {relatedRecords.map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}
              </Select>
            </EditField>
          )}
        </div>

        {(saveError || availabilityError) && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">{saveError ?? availabilityError}</p>}

        <div className="grid gap-2.5 lg:grid-cols-2">
          <TransportAvailabilityPicker title="Müsait araçlar" icon={<CarFront className="size-4" />} ready={Boolean(planningContext)} loading={isAvailabilityLoading} selectedId={vehicleResourceId} onSelect={(id) => setValue("vehicleResourceId", id, { shouldValidate: true })} items={availability?.vehicles.map((vehicle) => ({ id: vehicle.id, title: `${vehicle.brand} ${vehicle.model}`, detail: vehicle.licensePlate })) ?? []} />
          <TransportAvailabilityPicker title="Müsait şoförler" icon={<UserRound className="size-4" />} ready={Boolean(planningContext)} loading={isAvailabilityLoading} selectedId={driverResourceId} onSelect={(id) => setValue("driverResourceId", id, { shouldValidate: true })} items={availability?.drivers.map((driver) => ({ id: driver.id, title: driver.fullName, detail: driver.licenseClasses.join(", ") })) ?? []} />
        </div>
        {(errors.vehicleResourceId || errors.driverResourceId) && <p className="text-xs font-medium text-red-600">{errors.vehicleResourceId?.message ?? errors.driverResourceId?.message}</p>}
      </div>

      <DialogFooter className="shrink-0 border-t bg-card px-5 py-2.5 sm:items-center">
        <Button type="button" variant="ghost" onClick={onCancel}>Vazgeç</Button>
        <Button type="submit" disabled={isSubmitting || !availability}><Save />{isSubmitting ? "Kaydediliyor…" : "Değişiklikleri kaydet"}</Button>
      </DialogFooter>
    </form>
  )
}

function EditField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-0.5"><Label className="text-xs font-medium text-slate-700">{label}</Label>{children}{error && <p className="text-[11px] font-medium text-red-600">{error}</p>}</div>
}
