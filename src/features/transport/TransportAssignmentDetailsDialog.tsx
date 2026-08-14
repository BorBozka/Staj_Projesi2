import { CarFront, UserRound } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"

export function TransportAssignmentDetailsDialog({ assignment, open, onOpenChange }: { assignment: PlannedTransportAssignment | null; open: boolean; onOpenChange(open: boolean): void }) {
  const { meetings, visits } = useVisits()
  if (!assignment) return null
  const relatedMeeting = assignment.relatedMeetingId ? meetings.find((meeting) => meeting.id === assignment.relatedMeetingId) : undefined
  const relatedVisit = assignment.relatedVisitId ? visits.find((visit) => visit.id === assignment.relatedVisitId) : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-base">Araç görevi</DialogTitle>
          <DialogDescription>{formatTr(new Date(assignment.plannedStart), "d MMMM yyyy · HH:mm")} – {formatTr(new Date(assignment.plannedEnd), "HH:mm")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4 text-sm">
          <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
            <Detail icon={<CarFront className="size-4" />} label="Araç" value={`${assignment.vehicleName} · ${assignment.vehicleLicensePlate}`} />
            <Detail icon={<UserRound className="size-4" />} label="Şoför" value={assignment.driverName} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Görev / amaç</p>
            <p className="mt-1 text-slate-900">{assignment.purpose}</p>
          </div>
          <div className="grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
            <p><span className="block font-medium text-slate-500">Şirket</span>{assignment.companyName}</p>
            <p><span className="block font-medium text-slate-500">Tesis</span>{assignment.facilityName}</p>
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
      </DialogContent>
    </Dialog>
  )
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex min-w-0 items-start gap-2"><span className="mt-0.5 text-slate-500">{icon}</span><div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className="truncate font-medium text-slate-900">{value}</p></div></div>
}
