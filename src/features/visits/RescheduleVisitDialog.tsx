import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarClock } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Visit } from "@/domain/visits"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"

const schema = z
  .object({
    date: z.string().min(1, "Tarih zorunludur."),
    startTime: z.string().min(1, "Başlangıç saati zorunludur."),
    endTime: z.string().min(1, "Bitiş saati zorunludur."),
  })
  .superRefine((value, context) => {
    const start = new Date(`${value.date}T${value.startTime}:00`)
    const end = new Date(`${value.date}T${value.endTime}:00`)
    if (end <= start) context.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "Bitiş saati başlangıç saatinden sonra olmalıdır." })
  })

type Values = z.infer<typeof schema>

interface Props {
  visit: Visit | null
  open: boolean
  onOpenChange(open: boolean): void
  onSaved(message: string): void
}

export function RescheduleVisitDialog({ visit, open, onOpenChange, onSaved }: Props) {
  const { rescheduleVisit } = useVisits()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open && visit) {
      form.reset({
        date: formatTr(new Date(visit.plannedStart), "yyyy-MM-dd"),
        startTime: formatTr(new Date(visit.plannedStart), "HH:mm"),
        endTime: formatTr(new Date(visit.plannedEnd), "HH:mm"),
      })
      setSubmitError(null)
    }
  }, [form, open, visit])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!visit) return
    setSubmitError(null)
    try {
      await rescheduleVisit(visit.id, {
        plannedStart: new Date(`${values.date}T${values.startTime}:00`).toISOString(),
        plannedEnd: new Date(`${values.date}T${values.endTime}:00`).toISOString(),
      })
      onSaved("Ziyaret ertelendi.")
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Ziyaret ertelenemedi.")
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ziyareti ertele</DialogTitle>
          <DialogDescription>
            {visit ? `${visit.visitor.firstName} ${visit.visitor.lastName} için yeni tarih ve saati seçin.` : "Yeni ziyaret tarihini ve saatini seçin."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="reschedule-date">Tarih <span className="text-destructive">*</span></Label>
            <Input id="reschedule-date" className="mt-1" type="date" {...form.register("date")} />
            {form.formState.errors.date && <p className="mt-1 text-xs text-destructive">{form.formState.errors.date.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="reschedule-start">Başlangıç <span className="text-destructive">*</span></Label>
              <Input id="reschedule-start" className="mt-1" type="time" {...form.register("startTime")} />
              {form.formState.errors.startTime && <p className="mt-1 text-xs text-destructive">{form.formState.errors.startTime.message}</p>}
            </div>
            <div>
              <Label htmlFor="reschedule-end">Bitiş <span className="text-destructive">*</span></Label>
              <Input id="reschedule-end" className="mt-1" type="time" {...form.register("endTime")} />
              {form.formState.errors.endTime && <p className="mt-1 text-xs text-destructive">{form.formState.errors.endTime.message}</p>}
            </div>
          </div>
          {submitError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Vazgeç</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <CalendarClock />
              {form.formState.isSubmitting ? "Kaydediliyor…" : "Yeni Zamanı Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
