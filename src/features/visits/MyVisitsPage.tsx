import { CheckCircle2, Info, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"

import type { Visit } from "@/domain/visits"
import { CancelVisitDialog } from "@/features/visits/CancelVisitDialog"
import { RescheduleVisitDialog } from "@/features/visits/RescheduleVisitDialog"
import { UpcomingVisits } from "@/features/visits/UpcomingVisits"
import { VisitFormDialog } from "@/features/visits/VisitFormDialog"
import { VisitDetailsDialog } from "@/features/visits/VisitDetailsDialog"
import { VisitTimeline, type TimelineView } from "@/features/visits/VisitTimeline"
import { useVisits } from "@/features/visits/visit-context"

export function MyVisitsPage() {
  const { visits, referenceData, isLoading, error } = useVisits()
  const location = useLocation()
  const [view, setView] = useState<TimelineView>("week")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [formOpen, setFormOpen] = useState(false)
  const [editingVisit, setEditingVisit] = useState<Visit | undefined>()
  const [viewingVisit, setViewingVisit] = useState<Visit | null>(null)
  const [reschedulingVisit, setReschedulingVisit] = useState<Visit | null>(null)
  const [cancellingVisit, setCancellingVisit] = useState<Visit | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const openNewVisit = () => {
    setEditingVisit(undefined)
    setFormOpen(true)
  }

  const openEdit = (visit: Visit) => {
    setEditingVisit(visit)
    setFormOpen(true)
  }

  if (isLoading) return <PageSkeleton />

  const ownVisits = referenceData
    ? visits.filter((visit) => visit.creatorEmployeeId === referenceData.currentEmployee.employeeId)
    : visits
  const isManagerView = location.pathname.startsWith("/manager/")

  return (
    <div>
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <Info className="size-4" />{error}
        </div>
      )}

      {notice && (
        <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800" role="status">
          <span className="flex items-center gap-2"><CheckCircle2 className="size-4" />{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Mesajı kapat" className="rounded p-0.5 hover:bg-emerald-100"><X className="size-3.5" /></button>
        </div>
      )}

      <div className={"grid gap-3 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_320px] " + (isManagerView ? "xl:h-[calc(111.112dvh-36px)]" : "xl:h-[calc(100dvh-16px)]")}>
        <VisitTimeline
          visits={ownVisits}
          view={view}
          selectedDate={selectedDate}
          currentFacilityId={referenceData?.currentEmployee.facilityId}
          onViewChange={setView}
          onSelectedDateChange={setSelectedDate}
          onVisitOpen={setViewingVisit}
          onNewVisit={openNewVisit}
        />
        <UpcomingVisits visits={ownVisits} onView={setViewingVisit} currentFacilityId={referenceData?.currentEmployee.facilityId} />
      </div>

      <VisitDetailsDialog
        visit={viewingVisit}
        open={Boolean(viewingVisit)}
        onOpenChange={(open) => !open && setViewingVisit(null)}
        onEdit={openEdit}
        onReschedule={setReschedulingVisit}
        onCancel={setCancellingVisit}
        viewerRole={referenceData?.currentEmployee.role ?? "EMPLOYEE"}
      />
      <VisitFormDialog open={formOpen} onOpenChange={setFormOpen} visit={editingVisit} onSaved={setNotice} />
      <RescheduleVisitDialog
        visit={reschedulingVisit}
        open={Boolean(reschedulingVisit)}
        onOpenChange={(open) => !open && setReschedulingVisit(null)}
        onSaved={setNotice}
      />
      <CancelVisitDialog
        visit={cancellingVisit}
        open={Boolean(cancellingVisit)}
        onOpenChange={(open) => !open && setCancellingVisit(null)}
        onSaved={setNotice}
      />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-label="Ziyaretler yükleniyor">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-[520px] rounded-lg border bg-slate-100" />
        <div className="h-[420px] rounded-lg border bg-slate-100" />
      </div>
    </div>
  )
}
