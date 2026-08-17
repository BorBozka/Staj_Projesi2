import { AlertTriangle, CalendarClock, ChevronDown, ChevronRight, ChevronUp, Clock3, MailWarning, MapPin, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import type { Meeting, Visit } from "@/domain/visits"
import { MeetingLifecycleActions } from "@/features/visits/MeetingLifecycleActions"
import { getNextExpandedMeetingId } from "@/features/visits/hosted-meeting-notifications-utils"
import { getActionRequiredInvitationVisits, getInvitationActionLabel } from "@/features/visits/invitation-status"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"
import { getOverdueOpenHostedMeetings } from "@/lib/meeting-lifecycle"
import { visitService } from "@/services"

interface HostedMeetingEndNotificationsProps {
  onInvitationAction(visit: Visit): void
}

export function HostedMeetingEndNotifications({ onInvitationAction }: HostedMeetingEndNotificationsProps) {
  const { meetings, visits, referenceData, reload } = useVisits()
  const [now, setNow] = useState(() => new Date())
  const [isMinimized, setIsMinimized] = useState(false)
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null)
  const actorEmployeeId = referenceData?.currentEmployee.employeeId

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const overdueMeetings = useMemo(
    () => getOverdueOpenHostedMeetings(meetings, visits, actorEmployeeId, now),
    [actorEmployeeId, meetings, now, visits],
  )
  const invitationVisits = useMemo(
    () => getActionRequiredInvitationVisits(visits, actorEmployeeId),
    [actorEmployeeId, visits],
  )
  const actionCount = overdueMeetings.length + invitationVisits.length

  if (actionCount === 0 || !actorEmployeeId) return null

  if (isMinimized) {
    return (
      <Button type="button" variant="outline" className="fixed bottom-4 right-4 z-40 h-10 max-w-[calc(100vw-2rem)] gap-2 border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-950 shadow-lg hover:bg-amber-100" onClick={() => setIsMinimized(false)} aria-label={`${actionCount} işlem gerekiyor. Paneli genişlet`} aria-expanded={false} aria-controls="action-required-content">
        <AlertTriangle className="size-4 shrink-0 text-amber-700" />
        <span>{actionCount} işlem gerekiyor</span>
        <ChevronUp className="size-3.5 shrink-0" />
      </Button>
    )
  }

  return (
    <section className="fixed bottom-4 right-4 z-40 flex max-h-[min(70vh,36rem)] w-[min(350px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
      <button type="button" className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-left hover:bg-amber-100" onClick={() => setIsMinimized(true)} aria-expanded aria-controls="action-required-content">
        <AlertTriangle className="size-4 shrink-0 text-amber-700" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-amber-950">İşlem gerekenler</span>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-200 px-1.5 text-[11px] font-bold text-amber-900">{actionCount}</span>
        <ChevronDown className="size-4 shrink-0 text-amber-800" />
      </button>
      <div id="action-required-content" className="min-h-0 overflow-y-auto">
        {overdueMeetings.length > 0 && (
          <section aria-labelledby="meeting-actions-heading">
            <div id="meeting-actions-heading" className="flex items-center justify-between bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Toplantılar</span><span>{overdueMeetings.length}</span>
            </div>
            <div className="divide-y divide-slate-200">
              {overdueMeetings.map((meeting) => (
                <HostedMeetingNotificationRow key={meeting.id} meeting={meeting} meetingVisits={visits.filter((visit) => visit.meetingId === meeting.id)} actorEmployeeId={actorEmployeeId} now={now} isExpanded={expandedMeetingId === meeting.id} onExpandedChange={() => setExpandedMeetingId((current) => getNextExpandedMeetingId(current, meeting.id))} onChanged={reload} />
              ))}
            </div>
          </section>
        )}
        {invitationVisits.length > 0 && (
          <section aria-labelledby="invitation-actions-heading" className={overdueMeetings.length > 0 ? "border-t border-slate-200" : undefined}>
            <div id="invitation-actions-heading" className="flex items-center justify-between bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Davetler</span><span>{invitationVisits.length}</span>
            </div>
            <div className="divide-y divide-slate-200">
              {invitationVisits.map((visit) => <InvitationNotificationRow key={visit.id} visit={visit} onAction={onInvitationAction} />)}
            </div>
          </section>
        )}
      </div>
    </section>
  )
}

interface InvitationNotificationRowProps {
  visit: Visit
  onAction(visit: Visit): void
}

export function InvitationNotificationRow({ visit, onAction }: InvitationNotificationRowProps) {
  const hasFailed = visit.invitationStatus === "FAILED"

  return (
    <article className="px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded ${hasFailed ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
          <MailWarning className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-[13px] font-semibold text-slate-900">{visit.visitor.firstName} {visit.visitor.lastName}</h3>
            <span className={`text-[11px] font-medium ${hasFailed ? "text-red-700" : "text-amber-800"}`}>{hasFailed ? "Gönderim başarısız" : "Gönderilmedi"}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
            <span className="truncate">{visit.visitTypeName}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="size-3 shrink-0" />{visit.facilityName}</span>
            <span className="inline-flex items-center gap-1"><CalendarClock className="size-3 shrink-0" />{formatTr(new Date(visit.plannedStart), "d MMM · HH:mm")}</span>
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2 h-7 px-2 text-[11px]" onClick={() => onAction(visit)}>
            {getInvitationActionLabel(visit)}
          </Button>
        </div>
      </div>
    </article>
  )
}

interface HostedMeetingNotificationRowProps {
  meeting: Meeting
  meetingVisits: Visit[]
  actorEmployeeId: string
  now: Date
  isExpanded: boolean
  onExpandedChange(): void
  onChanged(): Promise<void>
}

export function HostedMeetingNotificationRow({ meeting, meetingVisits, actorEmployeeId, now, isExpanded, onExpandedChange, onChanged }: HostedMeetingNotificationRowProps) {
  const visitorNames = meetingVisits.map((visit) => `${visit.visitor.firstName} ${visit.visitor.lastName}`)
  const visitorSummary = visitorNames.length > 2 ? `${visitorNames.slice(0, 2).join(", ")} +${visitorNames.length - 2}` : visitorNames.join(", ") || "Ziyaretçi kaydı yok"
  const overdueMinutes = Math.max(0, Math.floor((now.getTime() - new Date(meeting.plannedEnd).getTime()) / 60_000))

  return (
    <article className="px-3 py-2.5">
      <button type="button" className="flex w-full items-start gap-2 text-left" onClick={onExpandedChange} aria-expanded={isExpanded} aria-controls={`hosted-meeting-actions-${meeting.id}`}>
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded text-slate-500">{isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-[13px] font-semibold text-slate-900">{meeting.visitTypeName}</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800"><Clock3 className="size-3" />{overdueMinutes === 0 ? "Bitiş saati geldi" : `${overdueMinutes} dk geçti`}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
            <span className="inline-flex min-w-0 items-center gap-1"><Users className="size-3 shrink-0" /><span className="truncate">{visitorSummary}</span></span>
            <span className="inline-flex items-center gap-1"><MapPin className="size-3 shrink-0" />{meeting.facilityName}</span>
            <span>{formatTr(new Date(meeting.plannedEnd), "d MMM · HH:mm")}</span>
          </div>
        </div>
      </button>
      {isExpanded && (
        <div id={`hosted-meeting-actions-${meeting.id}`} className="mt-2 border-t border-slate-100 pt-2">
          <MeetingLifecycleActions meetingLabel={meeting.visitTypeName} onExtend={async (minutes) => {
            await visitService.extendMeeting(meeting.id, { extensionMinutes: minutes, actorEmployeeId, currentTime: new Date().toISOString() })
            await onChanged()
          }} onClose={async () => {
            await visitService.closeMeeting(meeting.id, { source: "MANUAL", actorEmployeeId })
            await onChanged()
          }} />
        </div>
      )}
    </article>
  )
}
