import { zodResolver } from "@hookform/resolvers/zod"
import { addHours, setMinutes } from "date-fns"
import { Send } from "lucide-react"
import { cloneElement, isValidElement, useEffect, useId, useMemo, useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Visit, VisitReferenceData } from "@/domain/visits"
import { useVisits } from "@/features/visits/visit-context"
import { toVisitInput, visitFormSchema, type VisitFormValues } from "@/features/visits/visit-form-schema"
import { formatTr } from "@/lib/date"

function defaultsFor(visit?: Visit, referenceData?: VisitReferenceData | null): VisitFormValues {
  const roundedNow = setMinutes(addHours(new Date(), 1), 0)
  const end = addHours(roundedNow, 1)
  const currentEmployee = referenceData?.currentEmployee
  return {
    visitorFirstName: visit?.visitor.firstName ?? "",
    visitorLastName: visit?.visitor.lastName ?? "",
    visitorEmail: visit?.visitor.email ?? "",
    visitTypeId: visit?.visitTypeId ?? "",
    hostEmployeeId: visit?.hostEmployeeId ?? currentEmployee?.employeeId ?? "",
    hostCompanyId: visit?.hostCompanyId ?? currentEmployee?.companyId ?? "",
    facilityId: visit?.facilityId ?? currentEmployee?.facilityId ?? "",
    visitDate: formatTr(visit ? new Date(visit.plannedStart) : roundedNow, "yyyy-MM-dd"),
    startTime: formatTr(visit ? new Date(visit.plannedStart) : roundedNow, "HH:mm"),
    endTime: formatTr(visit ? new Date(visit.plannedEnd) : end, "HH:mm"),
    note: visit?.note ?? "",
  }
}

interface VisitFormDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  visit?: Visit
  onSaved(message: string): void
}

export function VisitFormDialog({ open, onOpenChange, visit, onSaved }: VisitFormDialogProps) {
  const { referenceData, createVisit, updateVisit } = useVisits()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<VisitFormValues>({ resolver: zodResolver(visitFormSchema), defaultValues: defaultsFor(visit, referenceData) })
  const companyId = form.watch("hostCompanyId")
  const facilityId = form.watch("facilityId")

  useEffect(() => {
    if (open) {
      form.reset(defaultsFor(visit, referenceData))
      setSubmitError(null)
    }
  }, [form, open, referenceData, visit])

  const facilities = useMemo(
    () => referenceData?.facilities.filter((facility) => facility.companyId === companyId) ?? [],
    [companyId, referenceData],
  )
  const employees = useMemo(
    () =>
      referenceData?.employees.filter(
        (employee) => employee.companyId === companyId && (!facilityId || employee.facilityIds.includes(facilityId)),
      ) ?? [],
    [companyId, facilityId, referenceData],
  )

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      if (visit) {
        await updateVisit(visit.id, toVisitInput(values))
        onSaved("Ziyaret bilgileri güncellendi.")
      } else {
        await createVisit(toVisitInput(values))
        onSaved("Davet hazırlandı ve ziyaret takviminize eklendi.")
      }
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Ziyaret kaydedilemedi.")
    }
  })

  const fieldError = (name: keyof VisitFormValues) => {
    const message = form.formState.errors[name]?.message
    return message ? <p className="mt-1 text-xs text-destructive">{message}</p> : null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle>{visit ? "Ziyareti Düzenle" : "Yeni Ziyaret"}</DialogTitle>
          {visit && <DialogDescription>Davet ve planlama bilgilerini güncelleyin.</DialogDescription>}
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-col" noValidate>
          <div className="max-h-[calc(90vh-142px)] space-y-4 overflow-y-auto px-5 py-4 scrollbar-thin">
          <fieldset className="space-y-3 rounded-md border bg-slate-50/60 p-3">
            <legend className="px-1 text-xs font-semibold text-slate-700">Ziyaretçi</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Ad" required error={fieldError("visitorFirstName")}>
                <Input autoFocus {...form.register("visitorFirstName")} />
              </FormField>
              <FormField label="Soyad" required error={fieldError("visitorLastName")}>
                <Input {...form.register("visitorLastName")} />
              </FormField>
              <FormField label="E-posta" required error={fieldError("visitorEmail")} className="sm:col-span-2">
                <Input type="email" placeholder="ziyaretci@firma.com" {...form.register("visitorEmail")} />
              </FormField>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-md border bg-slate-50/60 p-3">
            <legend className="px-1 text-xs font-semibold text-slate-700">Ziyaret Bilgileri</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Ziyaret Türü" required error={fieldError("visitTypeId")}>
                <Select {...form.register("visitTypeId")}>
                  <option value="">Ziyaret türü seçin</option>
                  {referenceData?.visitTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Ziyaret Edilecek Şirket" required error={fieldError("hostCompanyId")}>
                <Select
                  {...form.register("hostCompanyId", {
                    onChange: () => {
                      form.setValue("facilityId", "")
                      form.setValue("hostEmployeeId", "")
                    },
                  })}
                >
                  <option value="">Şirket seçin</option>
                  {referenceData?.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Tesis" required error={fieldError("facilityId")}>
                <Select
                  {...form.register("facilityId", { onChange: () => form.setValue("hostEmployeeId", "") })}
                  disabled={!companyId}
                >
                  <option value="">Tesis seçin</option>
                  {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
                </Select>
              </FormField>
              <FormField label="İlgili Personel" required error={fieldError("hostEmployeeId")}>
                <Select {...form.register("hostEmployeeId")} disabled={!facilityId}>
                  <option value="">İlgili personeli seçin</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.department}</option>)}
                </Select>
              </FormField>
              <FormField label="Tarih" required error={fieldError("visitDate")}>
                <Input type="date" {...form.register("visitDate")} />
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Başlangıç" required error={fieldError("startTime")}>
                  <Input type="time" {...form.register("startTime")} />
                </FormField>
                <FormField label="Bitiş" required error={fieldError("endTime")}>
                  <Input type="time" {...form.register("endTime")} />
                </FormField>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-md border bg-slate-50/60 p-3">
            <legend className="px-1 text-xs font-semibold text-slate-700">Ek Bilgi</legend>
            <FormField label="Not / Açıklama" error={fieldError("note")}>
              <Textarea rows={3} placeholder="Güvenlik veya ilgili personel için isteğe bağlı açıklama" {...form.register("note")} />
            </FormField>
          </fieldset>

          {submitError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{submitError}</p>}
          </div>

          <DialogFooter className="border-t bg-card px-5 py-3">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Send />
              {form.formState.isSubmitting ? "Kaydediliyor…" : visit ? "Değişiklikleri Kaydet" : "Daveti Gönder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormField({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const id = useId()
  const control = isValidElement<{ id?: string }>(children) ? cloneElement(children, { id }) : children
  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label}{required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
      </Label>
      <div className="mt-1">{control}</div>
      {error}
    </div>
  )
}
