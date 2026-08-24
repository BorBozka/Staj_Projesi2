import { differenceInMinutes } from "date-fns"
import type { ReactNode, RefObject } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import type { Meeting, Visit } from "@/domain/visits"
import { getRelatedRecordLabel } from "@/features/reports/fleet-report-utils"
import { formatDurationMinutes } from "@/features/reports/report-format"
import { formatTr } from "@/lib/date"

interface FleetAssignmentDetailDialogProps {
  assignment: PlannedTransportAssignment | null
  meetings: Meeting[]
  visits: Visit[]
  open: boolean
  onOpenChange(open: boolean): void
  returnFocusRef: RefObject<HTMLTableRowElement | null>
}

export function FleetAssignmentDetailDialog({ assignment, meetings, visits, open, onOpenChange, returnFocusRef }: FleetAssignmentDetailDialogProps) {
  if (!assignment) return null

  const plannedMinutes = Math.max(0, differenceInMinutes(new Date(assignment.plannedEnd), new Date(assignment.plannedStart)))
  const relatedLabel = getRelatedRecordLabel(assignment, meetings, visits)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!w-[min(640px,calc(100vw-2rem))] !max-w-none gap-0 overflow-hidden p-0"
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusRef.current?.focus()
        }}
      >
        <DialogHeader className="border-b bg-white px-5 py-4 pr-12">
          <DialogTitle className="text-base font-semibold text-slate-900">Araç / Şoför Görev Detayı</DialogTitle>
          <p className="text-xs text-slate-500">{formatTr(new Date(assignment.plannedStart), "d MMMM yyyy")} · {assignment.vehicleName}</p>
        </DialogHeader>

        <div className="max-h-[min(70vh,560px)] overflow-y-auto px-5 py-4">
          <DetailSection title="Görev" className="border-b border-slate-100 pb-4">
            <Field label="Amaç" value={<span className="whitespace-pre-wrap">{assignment.purpose}</span>} />
            <Field label="Durum" value={<FleetStatus status={assignment.status} />} />
          </DetailSection>

          <div className="grid gap-0 py-4 sm:grid-cols-2 sm:divide-x sm:divide-slate-200">
            <div className="space-y-4 sm:pr-5">
              <DetailSection title="Organizasyon">
                <Field label="Şirket" value={assignment.companyName} />
                <Field label="Tesis" value={assignment.facilityName} />
              </DetailSection>
              <DetailSection title="Araç">
                <Field label="Araç adı" value={assignment.vehicleName} />
                <Field label="Plaka" value={assignment.vehicleLicensePlate} />
              </DetailSection>
              <DetailSection title="Şoför">
                <Field label="Şoför adı" value={assignment.driverName} />
              </DetailSection>
            </div>

            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 sm:mt-0 sm:border-t-0 sm:pl-5 sm:pt-0">
              <DetailSection title="Plan">
                <Field label="Planlanan tarih" value={formatTr(new Date(assignment.plannedStart), "d MMMM yyyy")} />
                <Field label="Başlangıç" value={formatTr(new Date(assignment.plannedStart), "HH:mm")} />
                <Field label="Bitiş" value={formatTr(new Date(assignment.plannedEnd), "HH:mm")} />
                <Field label="Planlanan süre" value={formatDurationMinutes(plannedMinutes)} />
              </DetailSection>
              <DetailSection title="İlişkili kayıt">
                <Field label="Kayıt" value={relatedLabel} />
              </DetailSection>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DetailSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return <section aria-label={title} className={className}><h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h3><dl className="space-y-2.5">{children}</dl></section>
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return <div className="grid grid-cols-[108px_minmax(0,1fr)] gap-2 text-[13px]"><dt className="text-slate-500">{label}</dt><dd className="min-w-0 break-words font-medium text-slate-900">{value}</dd></div>
}

function FleetStatus({ status }: { status: PlannedTransportAssignment["status"] }) {
  const active = status === "ACTIVE"
  return <span className={active ? "inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700" : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"}>{active ? "Planlandı" : "İptal"}</span>
}
