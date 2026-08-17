import { CarFront, Pencil, UserRound, XCircle } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle, InternalDialogContent } from "@/components/ui/dialog"
import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import { TransportAssignmentEditForm } from "@/features/transport/TransportAssignmentEditForm"
import { formatTransportAssignmentSchedule } from "@/features/transport/transport-assignment-time"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"
import { transportAssignmentService } from "@/services"

interface TransportAssignmentDetailsDialogProps {
  assignment: PlannedTransportAssignment | null
  open: boolean
  onOpenChange(open: boolean): void
  onUpdated?(assignment: PlannedTransportAssignment): void
  onCancelled?(assignment: PlannedTransportAssignment): void
}

export function TransportAssignmentDetailsDialog({ assignment, open, onOpenChange, onUpdated, onCancelled }: TransportAssignmentDetailsDialogProps) {
  const { meetings, visits } = useVisits()
  const [isEditing, setIsEditing] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setIsEditing(false)
    setActionError(null)
  }, [assignment?.id, open])

  if (!assignment) return null
  const relatedMeeting = assignment.relatedMeetingId ? meetings.find((meeting) => meeting.id === assignment.relatedMeetingId) : undefined
  const relatedVisit = assignment.relatedVisitId ? visits.find((visit) => visit.id === assignment.relatedVisitId) : undefined

  const cancelAssignment = async () => {
    setIsCancelling(true)
    setActionError(null)
    try {
      onCancelled?.(await transportAssignmentService.cancelAssignment(assignment.id))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Planlı atama iptal edilemedi.")
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <InternalDialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-base">{isEditing ? "Araç görevini düzenle" : "Araç görevi"}</DialogTitle>
        </DialogHeader>
        {isEditing ? (
          <TransportAssignmentEditForm
            assignment={assignment}
            onCancel={() => setIsEditing(false)}
            onSaved={(updated) => {
              setIsEditing(false)
              onUpdated?.(updated)
            }}
          />
        ) : (
          <>
            <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4 text-sm">
              {actionError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{actionError}</p>}
              <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                <Detail icon={<CarFront className="size-4" />} label="Araç" value={`${assignment.vehicleName} · ${assignment.vehicleLicensePlate}`} />
                <Detail icon={<UserRound className="size-4" />} label="Şoför" value={assignment.driverName} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail label="Tarih / saat" value={formatTransportAssignmentSchedule(assignment, true)} />
                <Detail label="Durum" value={assignment.status === "ACTIVE" ? "Planlı" : "İptal"} />
              </div>
              <Detail label="Görev / amaç" value={assignment.purpose} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail label="Şirket" value={assignment.companyName} />
                <Detail label="Tesis" value={assignment.facilityName} />
              </div>
              {relatedVisit && (
                <div className="border-t pt-3 text-xs text-slate-600">
                  <p className="font-medium text-slate-500">İlgili ziyaret</p>
                  <p className="mt-1 text-slate-900">{relatedVisit.visitor.firstName} {relatedVisit.visitor.lastName} · {formatTr(new Date(relatedVisit.plannedStart), "d MMM HH:mm")}</p>
                </div>
              )}
              {relatedMeeting && (
                <div className="border-t pt-3 text-xs text-slate-600">
                  <p className="font-medium text-slate-500">İlgili toplantı</p>
                  <p className="mt-1 text-slate-900">{relatedMeeting.visitTypeName} · {relatedMeeting.hostEmployeeName} · {formatTr(new Date(relatedMeeting.plannedStart), "d MMM HH:mm")}</p>
                </div>
              )}
            </div>
            {assignment.status === "ACTIVE" && onUpdated && onCancelled && (
              <DialogFooter className="shrink-0 border-t bg-card px-5 py-3 sm:items-center sm:justify-between">
                <Button type="button" variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800" disabled={isCancelling} onClick={() => void cancelAssignment()}><XCircle />{isCancelling ? "İptal ediliyor…" : "İptal"}</Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(true)}><Pencil />Düzenle</Button>
              </DialogFooter>
            )}
          </>
        )}
      </InternalDialogContent>
    </Dialog>
  )
}

function Detail({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return <div className="flex min-w-0 items-start gap-2">{icon && <span className="mt-0.5 text-slate-500">{icon}</span>}<div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-0.5 font-medium text-slate-900">{value}</p></div></div>
}
