import { AlertTriangle } from "lucide-react"
import type { ReactNode, RefObject } from "react"
import { useCallback, useEffect, useRef, useState } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { InvitationStatus, Visit } from "@/domain/visits"
import { MeetingResourcePanel } from "@/features/resources/MeetingResourcePanel"
import { VisitStatusBadge } from "@/features/visits/VisitStatusBadge"
import { getVisibleAdditionalRequirementNote } from "@/features/visits/visit-visibility"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"
import { resourceAssignmentService } from "@/services"

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

interface ManagerVisitDetailsDialogProps {
  visit: Visit | null
  open: boolean
  onOpenChange(open: boolean): void
  returnFocusRef: RefObject<HTMLElement | null>
}

export function ManagerVisitDetailsDialog({ visit, open, onOpenChange, returnFocusRef }: ManagerVisitDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<"details" | "resources">("details")
  const [assignmentsCount, setAssignmentsCount] = useState(0)
  const [isResourcesDirty, setIsResourcesDirty] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [lockedTop, setLockedTop] = useState<number | null>(null)
  const isResourcesDirtyRef = useRef(isResourcesDirty)
  isResourcesDirtyRef.current = isResourcesDirty

  useEffect(() => {
    if (open) {
      setActiveTab("details")
      setAssignmentsCount(0)
      setIsResourcesDirty(false)
      setShowDiscardDialog(false)
    } else {
      setLockedTop(null)
    }
  }, [open, visit?.id])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      if (isResourcesDirtyRef.current) {
        setShowDiscardDialog(true)
        return
      }
    }
    onOpenChange(nextOpen)
  }, [onOpenChange])

  function handleDiscardConfirm() {
    setShowDiscardDialog(false)
    setIsResourcesDirty(false)
    onOpenChange(false)
  }

  if (!visit) return null
  const additionalRequirementNote = getVisibleAdditionalRequirementNote(visit, "MANAGER")
  const hasActualUpdate = new Date(visit.updatedAt).getTime() > new Date(visit.createdAt).getTime()
  const plannedSummary = `${formatTr(new Date(visit.plannedStart), "d MMM yyyy")} · ${formatTr(new Date(visit.plannedStart), "HH:mm")}–${formatTr(new Date(visit.plannedEnd), "HH:mm")}`

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn("!max-h-[85vh] !w-[min(820px,calc(100vw-2rem))] !max-w-none flex flex-col gap-0 overflow-hidden p-0", lockedTop !== null && "!translate-y-0")}
          style={lockedTop === null ? undefined : { top: lockedTop }}
          onOpenAutoFocus={(event) => {
            const content = event.currentTarget as HTMLElement | null
            if (content) setLockedTop(content.getBoundingClientRect().top)
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocusRef.current?.focus()
          }}
        >
          <DialogHeader className="shrink-0 border-b bg-white px-5 pb-0 pt-4 pr-12">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="min-w-0 truncate text-lg font-semibold text-slate-900">
                {visit.visitor.firstName} {visit.visitor.lastName}
              </DialogTitle>
              <VisitStatusBadge status={visit.status} />
            </div>
            <p className="mt-1 text-xs text-slate-600">{visit.visitTypeName} · {plannedSummary}</p>
            <div className="mt-3 flex items-center gap-5 text-xs font-medium">
              <TabButton active={activeTab === "details"} onClick={() => setActiveTab("details")}>Ziyaret Bilgileri</TabButton>
              <TabButton active={activeTab === "resources"} onClick={() => setActiveTab("resources")}>
                Kaynaklar
                {assignmentsCount > 0 && <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-700">{assignmentsCount}</span>}
                {isResourcesDirty && <span className="inline-block size-1.5 rounded-full bg-amber-500" title="Kaydedilmemiş değişiklikler" />}
              </TabButton>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className={cn("px-5 py-4", activeTab !== "details" && "hidden")}>
              <div className="grid gap-0 md:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] md:divide-x md:divide-slate-200">
                <DetailSection title="Ziyaretçi">
                  <Field label="E-posta" value={visit.visitor.email} />
                  {visit.visitor.phone && <Field label="Telefon" value={visit.visitor.phone} />}
                  <Field label="Davet" value={<InvitationStatus visit={visit} />} />
                </DetailSection>
                <DetailSection title="Ziyaret" className="mt-5 border-t border-slate-100 pt-5 md:mt-0 md:border-t-0 md:pl-5 md:pt-0">
                  <Field label="İlgili personel" value={visit.hostEmployeeName} />
                  <Field label="Şirket" value={visit.hostCompanyName} />
                  <Field label="Tesis" value={visit.facilityName} />
                  {visit.actualCheckIn && <Field label="Gerçek giriş" value={formatTr(new Date(visit.actualCheckIn), "d MMM yyyy · HH:mm")} />}
                  {visit.actualCheckOut && <Field label="Gerçek çıkış" value={formatTr(new Date(visit.actualCheckOut), "d MMM yyyy · HH:mm")} />}
                </DetailSection>
              </div>
              {(additionalRequirementNote || visit.note || hasActualUpdate) && <div className="my-4 border-t border-slate-200" />}
              <div className="space-y-3">
                {additionalRequirementNote && <NoteSection title="İlave gereksinim" value={additionalRequirementNote} className="border-violet-200 bg-violet-50/70 text-violet-900" />}
                {visit.note && <NoteSection title="Not" value={visit.note} compact />}
                {hasActualUpdate && <p className="text-[11px] text-slate-500">Son güncelleme: {formatTr(new Date(visit.updatedAt), "d MMM yyyy · HH:mm")}</p>}
              </div>
            </div>
            <div className={cn("px-5 py-4", activeTab !== "resources" && "hidden")}>
              <MeetingResourcePanel meetingId={visit.meetingId} service={resourceAssignmentService} onAssignmentsCountChange={setAssignmentsCount} onDirtyChange={setIsResourcesDirty} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent className="max-w-sm p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-amber-100"><AlertTriangle className="size-5 text-amber-600" /></span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Kaydedilmemiş değişiklikler</p>
              <p className="mt-1 text-xs text-slate-600">Kaynak atamaları taslağında kaydedilmemiş değişiklikler var. Değişiklikleri silmek istiyor musunuz?</p>
            </div>
            <div className="mt-1 flex w-full flex-col gap-2">
              <button type="button" onClick={handleDiscardConfirm} className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">Değişiklikleri sil</button>
              <button type="button" onClick={() => setShowDiscardDialog(false)} className="w-full rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Vazgeç</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick(): void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("flex items-center gap-1.5 rounded-xs border-b-2 pb-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600", active ? "border-slate-900 font-semibold text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700")}>{children}</button>
}

function DetailSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return <section aria-label={title} className={className}><h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h3><dl className="space-y-2.5">{children}</dl></section>
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 text-[13px]"><dt className="text-slate-500">{label}</dt><dd className="min-w-0 break-words font-medium text-slate-900">{value}</dd></div>
}

function InvitationStatus({ visit }: { visit: Visit }) {
  return <div className="space-y-1.5"><span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", invitationSurfaces[visit.invitationStatus])}>{invitationLabels[visit.invitationStatus]}</span>{visit.invitationSentAt && <p className="text-xs font-normal text-slate-600">Gönderim: {formatTr(new Date(visit.invitationSentAt), "d MMM yyyy · HH:mm")}</p>}{visit.invitationError && <p className="text-xs font-normal text-red-700">{visit.invitationError}</p>}</div>
}

function NoteSection({ title, value, className, compact = false }: { title: string; value: string; className?: string; compact?: boolean }) {
  return <section className={cn(compact ? "border-l-2 border-slate-200 py-0.5 pl-3" : "rounded-lg border bg-slate-50/60 p-3", className)}><h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h3><p className="mt-1 whitespace-pre-wrap text-[13px] leading-5">{value}</p></section>
}
