import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Send,
  UserRound,
} from "lucide-react"
import type { ReactNode, RefObject } from "react"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DrawerShell } from "@/components/ui/drawer-shell"
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

interface ManagerVisitDetailsSheetProps {
  visit: Visit | null
  open: boolean
  onOpenChange(open: boolean): void
  returnFocusRef: RefObject<HTMLElement | null>
}

export function ManagerVisitDetailsSheet({
  visit,
  open,
  onOpenChange,
  returnFocusRef,
}: ManagerVisitDetailsSheetProps) {
  const [activeTab, setActiveTab] = useState<"details" | "resources">("details")
  const [assignmentsCount, setAssignmentsCount] = useState<number>(0)
  const [isResourcesDirty, setIsResourcesDirty] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  // Keep a stable ref so the onBeforeClose callback can read current dirty state.
  const isResourcesDirtyRef = useRef(isResourcesDirty)
  isResourcesDirtyRef.current = isResourcesDirty

  // Set to true before a programmatic confirmed close so the guard does not intercept it.
  const isForceClosingRef = useRef(false)

  // Reset tab and dirty state whenever a new visit opens.
  useEffect(() => {
    if (open) {
      setActiveTab("details")
      setAssignmentsCount(0)
      setIsResourcesDirty(false)
      setShowDiscardDialog(false)
    }
  }, [open, visit?.id])

  // Called by DrawerShell's ✕ / Escape / overlay close attempt.
  const handleBeforeClose = useCallback((): boolean | undefined => {
    // Allow if this close was triggered programmatically after the user confirmed discard.
    if (isForceClosingRef.current) {
      isForceClosingRef.current = false
      return undefined
    }
    if (isResourcesDirtyRef.current) {
      setShowDiscardDialog(true)
      return false // block close
    }
    return undefined // allow close
  }, [])

  function handleDiscardConfirm() {
    setShowDiscardDialog(false)
    setIsResourcesDirty(false)
    // Mark as force-closing so the dirty guard in handleBeforeClose does not intercept
    // the close that onOpenChange(false) immediately triggers.
    isForceClosingRef.current = true
    onOpenChange(false)
  }

  if (!visit) return null

  const additionalRequirementNote = getVisibleAdditionalRequirementNote(visit, "MANAGER")
  const hasActualUpdate =
    new Date(visit.updatedAt).getTime() > new Date(visit.createdAt).getTime()

  return (
    <>
      <DrawerShell
        open={open}
        onOpenChange={onOpenChange}
        onBeforeClose={handleBeforeClose}
        widthClass="max-w-[540px] sm:w-[min(540px,calc(100vw-2rem))]"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusRef.current?.focus()
        }}
      >
        <DialogHeader className="sticky top-0 z-10 border-b bg-white px-5 pb-0 pr-12 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="min-w-0 truncate text-lg font-semibold text-slate-900">
              {visit.visitor.firstName} {visit.visitor.lastName}
            </DialogTitle>
            <VisitStatusBadge status={visit.status} />
          </div>

          {/* Restrained text tabs */}
          <div className="mt-3 flex items-center gap-5 border-b border-transparent text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={cn(
                "rounded-xs pb-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                activeTab === "details"
                  ? "border-b-2 border-slate-900 font-semibold text-slate-900"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              Ziyaret Bilgileri
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("resources")}
              className={cn(
                "flex items-center gap-1.5 rounded-xs pb-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                activeTab === "resources"
                  ? "border-b-2 border-slate-900 font-semibold text-slate-900"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              <span>Kaynaklar</span>
              {assignmentsCount > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-700">
                  {assignmentsCount}
                </span>
              )}
              {isResourcesDirty && (
                <span className="inline-block size-1.5 rounded-full bg-amber-500" title="Kaydedilmemiş değişiklikler" />
              )}
            </button>
          </div>
        </DialogHeader>

        {/* Tab bodies — both rendered, toggled via hidden class to preserve draft state */}
        <div className={cn("space-y-6 px-5 py-4", activeTab !== "details" && "hidden")}>
          <DetailSection title="Ziyaretçi">
            <DetailRow icon={Mail} label="E-posta" value={visit.visitor.email} />
            {visit.visitor.phone && (
              <DetailRow icon={Phone} label="Telefon" value={visit.visitor.phone} />
            )}
            <DetailRow icon={CalendarClock} label="Ziyaret türü" value={visit.visitTypeName} />
            <DetailRow
              icon={Send}
              label="Davet durumu"
              value={
                <div className="space-y-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
                      invitationSurfaces[visit.invitationStatus],
                    )}
                  >
                    <Send className="size-3.5" />
                    {invitationLabels[visit.invitationStatus]}
                  </span>
                  {visit.invitationSentAt && (
                    <p className="text-xs font-normal text-slate-600">
                      Gönderim:{" "}
                      {formatTr(new Date(visit.invitationSentAt), "d MMM yyyy · HH:mm")}
                    </p>
                  )}
                  {visit.invitationError && (
                    <p className="text-xs font-normal leading-5 text-red-700">
                      {visit.invitationError}
                    </p>
                  )}
                </div>
              }
            />
          </DetailSection>

          <DetailSection title="Planlama">
            <DetailRow icon={UserRound} label="Ev sahibi" value={visit.hostEmployeeName} />
            <DetailRow
              icon={MapPin}
              label="Şirket / tesis"
              value={`${visit.hostCompanyName} · ${visit.facilityName}`}
            />
            <DetailRow
              icon={CalendarClock}
              label="Planlanan zaman"
              value={`${formatTr(
                new Date(visit.plannedStart),
                "d MMMM yyyy EEEE · HH:mm",
              )}–${formatTr(new Date(visit.plannedEnd), "HH:mm")}`}
            />
            {visit.actualCheckIn && (
              <DetailRow
                icon={Clock3}
                label="Gerçek giriş"
                value={formatTr(new Date(visit.actualCheckIn), "d MMM yyyy · HH:mm")}
              />
            )}
            {visit.actualCheckOut && (
              <DetailRow
                icon={CheckCircle2}
                label="Gerçek çıkış"
                value={formatTr(new Date(visit.actualCheckOut), "d MMM yyyy · HH:mm")}
              />
            )}
          </DetailSection>

          {additionalRequirementNote && (
            <NoteSection
              icon={ClipboardList}
              title="İlave gereksinim"
              value={additionalRequirementNote}
              className="border-violet-200 bg-violet-50/70 text-violet-900 shadow-xs"
            />
          )}
          {visit.note && (
            <NoteSection icon={ClipboardList} title="Genel ziyaret notu" value={visit.note} />
          )}
          {hasActualUpdate && (
            <p className="pt-1 text-[11px] leading-4 text-slate-500">
              Son güncelleme:{" "}
              {formatTr(new Date(visit.updatedAt), "d MMM yyyy · HH:mm")}
            </p>
          )}
        </div>

        {/* Resources tab — always mounted to preserve draft on tab switch */}
        <div className={cn("px-5 py-4", activeTab !== "resources" && "hidden")}>
          <MeetingResourcePanel
            meetingId={visit.meetingId}
            service={resourceAssignmentService}
            onAssignmentsCountChange={setAssignmentsCount}
            onDirtyChange={setIsResourcesDirty}
          />
        </div>
      </DrawerShell>

      {/* Discard confirmation dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent className="max-w-sm p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="size-5 text-amber-600" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Kaydedilmemiş değişiklikler
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Kaynak atamaları taslağında kaydedilmemiş değişiklikler var.
                Değişiklikleri silmek istiyor musunuz?
              </p>
            </div>
            <div className="mt-1 flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={handleDiscardConfirm}
                className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                Değişiklikleri sil
              </button>
              <button
                type="button"
                onClick={() => setShowDiscardDialog(false)}
                className="w-full rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Geri dön
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {title}
      </h3>
      <dl className="divide-y divide-slate-100">{children}</dl>
    </section>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail
  label: string
  value: ReactNode
}) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2.5 text-[13px] last:border-b-0">
      <dt className="flex items-start gap-1.5 font-normal text-slate-500">
        <Icon className="mt-0.5 size-3.5 shrink-0" />
        {label}
      </dt>
      <dd className="min-w-0 break-words font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function NoteSection({
  icon: Icon,
  title,
  value,
  className,
}: {
  icon: typeof ClipboardList
  title: string
  value: string
  className?: string
}) {
  return (
    <section className={cn("rounded-lg border bg-slate-50/60 p-3.5", className)}>
      <h3 className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="size-3.5" />
        {title}
      </h3>
      <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-5">{value}</p>
    </section>
  )
}
