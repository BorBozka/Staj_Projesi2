import { CalendarClock, Pencil, XCircle } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle, InternalDialogContent } from "@/components/ui/dialog"
import type { InvitationStatus, Visit } from "@/domain/visits"
import { VisitStatusBadge } from "@/features/visits/VisitStatusBadge"
import { getVisibleAdditionalRequirementNote, type VisitViewerRole } from "@/features/visits/visit-visibility"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"

const invitationLabels: Record<InvitationStatus, string> = {
  NOT_SENT: "Davet gönderilmedi",
  SENDING: "Davet gönderiliyor",
  SENT: "Davet gönderildi",
  FAILED: "Gönderim başarısız",
}

const invitationSurfaces: Record<InvitationStatus, string> = {
  NOT_SENT: "border-amber-200 bg-amber-50 text-amber-800",
  SENDING: "border-blue-200 bg-blue-50 text-blue-800",
  SENT: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-red-200 bg-red-50 text-red-800",
}

interface Props {
  visit: Visit | null
  open: boolean
  onOpenChange(open: boolean): void
  onEdit(visit: Visit): void
  onReschedule(visit: Visit): void
  onCancel(visit: Visit): void
  readOnly?: boolean
  viewerRole?: VisitViewerRole
}

export function VisitDetailsDialog({ visit, open, onOpenChange, onEdit, onReschedule, onCancel, readOnly = false, viewerRole = "SECURITY" }: Props) {
  if (!visit) return null
  const additionalRequirementNote = getVisibleAdditionalRequirementNote(visit, viewerRole)
  const plannedSummary = `${formatTr(new Date(visit.plannedStart), "d MMM yyyy")} · ${formatTr(new Date(visit.plannedStart), "HH:mm")}–${formatTr(new Date(visit.plannedEnd), "HH:mm")}`

  const openAction = (action: (selectedVisit: Visit) => void) => {
    onOpenChange(false)
    action(visit)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <InternalDialogContent className="!w-[min(640px,calc(100vw-2rem))] !max-w-none gap-0 overflow-hidden p-0" onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <div className="flex items-center gap-2">
            <DialogTitle className="min-w-0 truncate text-lg font-semibold text-slate-900">{visit.visitor.firstName} {visit.visitor.lastName}</DialogTitle>
            <VisitStatusBadge status={visit.status} />
          </div>
          <p className="mt-1 text-xs text-slate-600">{visit.visitTypeName} · {plannedSummary}</p>
        </DialogHeader>

        <div className="px-5 py-4">
          <div className="grid gap-0 min-[560px]:grid-cols-2 min-[560px]:divide-x min-[560px]:divide-slate-200">
            <DetailSection title="Ziyaretçi">
              <Field label="E-posta" value={visit.visitor.email ?? <span className="font-normal text-slate-500">E-posta yok</span>} valueClassName="sm:whitespace-nowrap" />
              <Field label="Ziyaretçi Şirketi" value={visit.visitor.company} />
              {visit.visitor.phone && <Field label="Telefon" value={visit.visitor.phone} />}
              <Field label="Davet" labelClassName="whitespace-nowrap" value={<InvitationStatus visit={{ ...visit, invitationSentAt: visit.invitationStatus === "SENT" ? visit.invitationSentAt : undefined, invitationError: visit.invitationStatus === "FAILED" ? visit.invitationError : undefined }} />} />
            </DetailSection>
            <DetailSection title="Ziyaret" className="mt-5 border-t border-slate-100 pt-5 min-[560px]:mt-0 min-[560px]:border-t-0 min-[560px]:pl-5 min-[560px]:pt-0">
              <Field label="İlgili personel" value={visit.hostEmployeeName} />
              <Field label="Şirket" value={visit.hostCompanyName} />
              <Field label="Tesis" value={visit.facilityName} />
              {visit.actualCheckIn && <Field label="Gerçek giriş" value={formatTr(new Date(visit.actualCheckIn), "d MMM yyyy · HH:mm")} />}
              {visit.actualCheckOut && <Field label="Gerçek çıkış" value={formatTr(new Date(visit.actualCheckOut), "d MMM yyyy · HH:mm")} />}
            </DetailSection>
          </div>
          {(visit.note || additionalRequirementNote) && <div className="my-4 border-t border-slate-200" />}
          <div className="space-y-3">
            {visit.note && <NoteSection title="Not" value={visit.note} />}
            {additionalRequirementNote && <NoteSection title="İlave gereksinim" value={additionalRequirementNote} />}
          </div>
        </div>

        {!readOnly && visit.status === "PLANNED" && (
          <DialogFooter className="border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" className="border-red-200 text-destructive hover:border-red-300 hover:bg-red-100 hover:text-destructive hover:shadow-sm" onClick={() => openAction(onCancel)}><XCircle />İptal Et</Button>
            <div className="flex gap-2">
              <Button variant="outline" className="hover:border-slate-300 hover:bg-slate-200 hover:text-slate-950 hover:shadow-sm" onClick={() => openAction(onReschedule)}><CalendarClock />Ertele</Button>
              <Button className="hover:bg-primary/80 hover:shadow-md" onClick={() => openAction(onEdit)}><Pencil />Düzenle</Button>
            </div>
          </DialogFooter>
        )}
      </InternalDialogContent>
    </Dialog>
  )
}

function DetailSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return <section aria-label={title} className={className}><h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h3><dl className="space-y-2.5">{children}</dl></section>
}

function Field({ label, value, labelClassName, valueClassName }: { label: string; value: ReactNode; labelClassName?: string; valueClassName?: string }) {
  return <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-2 text-[13px]"><dt className={cn("text-slate-500", labelClassName)}>{label}</dt><dd className={cn("min-w-0 break-words font-medium text-slate-900", valueClassName)}>{value}</dd></div>
}

function InvitationStatus({ visit }: { visit: Visit }) {
  return <div className="space-y-1.5"><span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", invitationSurfaces[visit.invitationStatus])}>{invitationLabels[visit.invitationStatus]}</span>{visit.invitationSentAt && <p className="text-xs font-normal text-slate-600">Gönderim: {formatTr(new Date(visit.invitationSentAt), "d MMM yyyy · HH:mm")}</p>}{visit.invitationError && <p className="min-w-0 break-words text-xs font-normal leading-5 text-red-700">{visit.invitationError}</p>}</div>
}

function NoteSection({ title, value }: { title: string; value: string }) {
  return <section className="border-l-2 border-slate-200 py-0.5 pl-3"><h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h3><p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-slate-800">{value}</p></section>
}
