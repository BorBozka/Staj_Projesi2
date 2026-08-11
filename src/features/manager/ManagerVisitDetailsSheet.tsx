import { CalendarClock, CheckCircle2, ClipboardList, Clock3, Mail, MapPin, Phone, Send, UserRound } from "lucide-react"
import type { ReactNode, RefObject } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { InvitationStatus, Visit } from "@/domain/visits"
import { VisitStatusBadge } from "@/features/visits/VisitStatusBadge"
import { getVisibleAdditionalRequirementNote } from "@/features/visits/visit-visibility"
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

interface ManagerVisitDetailsSheetProps {
  visit: Visit | null
  open: boolean
  onOpenChange(open: boolean): void
  returnFocusRef: RefObject<HTMLElement | null>
}

export function ManagerVisitDetailsSheet({ visit, open, onOpenChange, returnFocusRef }: ManagerVisitDetailsSheetProps) {
  if (!visit) return null

  const additionalRequirementNote = getVisibleAdditionalRequirementNote(visit, "MANAGER")
  const hasActualUpdate = new Date(visit.updatedAt).getTime() > new Date(visit.createdAt).getTime()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="left-auto right-0 top-0 h-dvh max-h-none w-full max-w-[460px] translate-x-0 translate-y-0 content-start gap-0 overflow-y-auto rounded-none border-y-0 border-r-0 p-0 shadow-2xl sm:w-[min(460px,calc(100vw-2rem))] [&>button]:right-3 [&>button]:top-3 [&>button]:z-20 [&>button]:flex [&>button]:size-8 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:hover:bg-slate-100"
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusRef.current?.focus()
        }}
      >
        <DialogHeader className="sticky top-0 z-10 border-b bg-white px-5 py-3.5 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="min-w-0 truncate text-lg">{visit.visitor.firstName} {visit.visitor.lastName}</DialogTitle>
            <VisitStatusBadge status={visit.status} />
          </div>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          <DetailSection title="Ziyaretçi">
            <DetailRow icon={Mail} label="E-posta" value={visit.visitor.email} />
            {visit.visitor.phone && <DetailRow icon={Phone} label="Telefon" value={visit.visitor.phone} />}
            <DetailRow icon={CalendarClock} label="Ziyaret türü" value={visit.visitTypeName} />
            <DetailRow
              icon={Send}
              label="Davet durumu"
              value={(
                <div className="space-y-1.5">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold", invitationSurfaces[visit.invitationStatus])}>
                    <Send className="size-3.5" />{invitationLabels[visit.invitationStatus]}
                  </span>
                  {visit.invitationSentAt && <p className="text-xs font-normal text-slate-600">Gönderim: {formatTr(new Date(visit.invitationSentAt), "d MMM yyyy · HH:mm")}</p>}
                  {visit.invitationError && <p className="text-xs font-normal leading-5 text-red-700">{visit.invitationError}</p>}
                </div>
              )}
            />
          </DetailSection>

          <DetailSection title="Planlama">
            <DetailRow icon={UserRound} label="Ev sahibi" value={visit.hostEmployeeName} />
            <DetailRow icon={MapPin} label="Şirket / tesis" value={`${visit.hostCompanyName} · ${visit.facilityName}`} />
            <DetailRow icon={CalendarClock} label="Planlanan zaman" value={`${formatTr(new Date(visit.plannedStart), "d MMMM yyyy EEEE · HH:mm")}–${formatTr(new Date(visit.plannedEnd), "HH:mm")}`} />
            {visit.actualCheckIn && <DetailRow icon={Clock3} label="Gerçek giriş" value={formatTr(new Date(visit.actualCheckIn), "d MMM yyyy · HH:mm")} />}
            {visit.actualCheckOut && <DetailRow icon={CheckCircle2} label="Gerçek çıkış" value={formatTr(new Date(visit.actualCheckOut), "d MMM yyyy · HH:mm")} />}
          </DetailSection>

          {additionalRequirementNote && (
            <NoteSection icon={ClipboardList} title="İlave gereksinim" value={additionalRequirementNote} className="border-violet-200 bg-violet-50/70" />
          )}
          {visit.note && <NoteSection icon={ClipboardList} title="Genel ziyaret notu" value={visit.note} />}

          {hasActualUpdate && <p className="border-t pt-3 text-[11px] leading-4 text-slate-500">Son güncelleme: {formatTr(new Date(visit.updatedAt), "d MMM yyyy · HH:mm")}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h3>
      <dl className="divide-y rounded-lg border bg-slate-50/60 px-3">{children}</dl>
    </section>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 py-2.5 text-[13px]">
      <dt className="flex items-start gap-1.5 text-slate-500"><Icon className="mt-0.5 size-3.5 shrink-0" />{label}</dt>
      <dd className="min-w-0 break-words font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function NoteSection({ icon: Icon, title, value, className }: { icon: typeof ClipboardList; title: string; value: string; className?: string }) {
  return (
    <section className={cn("rounded-lg border bg-slate-50/60 p-3.5", className)}>
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"><Icon className="size-3.5" />{title}</h3>
      <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-5 text-slate-800">{value}</p>
    </section>
  )
}
