import { renderToStaticMarkup } from "react-dom/server"
import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"

import type { Meeting, Visit } from "@/domain/visits"
import { HostedMeetingEndNotifications, HostedMeetingNotificationRow, InvitationNotificationRow } from "@/features/visits/HostedMeetingEndNotifications"
import { useVisits } from "@/features/visits/visit-context"
import { getNextExpandedMeetingId } from "@/features/visits/hosted-meeting-notifications-utils"
import { getActionRequiredInvitationVisits, getVisiblePendingInvitationVisits } from "@/features/visits/invitation-status"

vi.mock("@/features/visits/visit-context", () => ({ useVisits: vi.fn() }))

const meeting: Meeting = {
  id: "meeting-1", creatorEmployeeId: "employee-1", visitTypeId: "type-1", visitTypeName: "Müşteri toplantısı",
  hostEmployeeId: "host-1", hostEmployeeName: "Ayşe Yılmaz", hostCompanyId: "company-1", hostCompanyName: "Merkez",
  facilityId: "facility-1", facilityName: "Genel Müdürlük", plannedStart: "2026-08-13T08:00:00.000Z", plannedEnd: "2026-08-13T09:00:00.000Z",
  hasAdditionalRequirements: false, createdAt: "2026-08-13T07:00:00.000Z", updatedAt: "2026-08-13T07:00:00.000Z",
}

const visit: Visit = {
  ...meeting, id: "visit-1", meetingId: meeting.id,
  visitor: { id: "visitor-1", firstName: "Ali", lastName: "Demir", email: "ali@example.com", company: "Test A.Ş." },
  status: "CHECKED_IN", invitationStatus: "SENT", createdAt: meeting.createdAt, updatedAt: meeting.updatedAt,
}

const invitationVisit: Visit = {
  ...visit,
  id: "visit-2",
  creatorEmployeeId: "host-1",
  visitor: { id: "visitor-2", firstName: "Ece", lastName: "Kaya", email: "ece@example.com", company: "Test A.Ş." },
  status: "PLANNED",
  invitationStatus: "NOT_SENT",
}

describe("HostedMeetingEndNotifications", () => {
  it("renders a narrower panel with an accessible header toggle", () => {
    vi.mocked(useVisits).mockReturnValue({ meetings: [meeting], visits: [visit], referenceData: { currentEmployee: { employeeId: "host-1" } }, reload: vi.fn() } as never)

    const markup = renderToStaticMarkup(<HostedMeetingEndNotifications onInvitationAction={vi.fn()} isEmployeeView />)

    expect(markup).toContain("right-3 w-[min(256px,calc(100vw-2rem))]")
    expect(markup).toContain('max-height:calc(100dvh - 94px)')
    expect(markup).toContain("İşlem gerekenler")
    expect(markup).toContain("Gecikmiş toplantılar")
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('aria-controls="action-required-content"')
  })

  it("does not render a notification when all linked Visits are terminal", () => {
    vi.mocked(useVisits).mockReturnValue({
      meetings: [meeting],
      visits: [{ ...visit, status: "CANCELLED" }],
      referenceData: { currentEmployee: { employeeId: "host-1" } },
      reload: vi.fn(),
    } as never)

    expect(renderToStaticMarkup(<HostedMeetingEndNotifications onInvitationAction={vi.fn()} />)).toBe("")
  })

  it("renders action-required invitations as a separate compact group", () => {
    vi.mocked(useVisits).mockReturnValue({
      meetings: [],
      visits: [invitationVisit],
      referenceData: { currentEmployee: { employeeId: "host-1" } },
      reload: vi.fn(),
    } as never)

    const markup = renderToStaticMarkup(<HostedMeetingEndNotifications onInvitationAction={vi.fn()} />)

    expect(markup).toContain("İşlem gerekenler")
    expect(markup).toContain("Davetler")
    expect(markup).toContain("Ece Kaya")
    expect(markup).toContain("Gönderilmedi")
    expect(markup).toContain("Daveti gönder")
    expect(markup).not.toContain("Toplantılar")
  })

  it("keeps exactly one selected meeting expanded", () => {
    expect(getNextExpandedMeetingId("meeting-1", "meeting-1")).toBeNull()
    expect(getNextExpandedMeetingId("meeting-1", "meeting-2")).toBe("meeting-2")
  })

  it("renders compact meeting details and only renders actions for the expanded row", () => {
    const props = { meeting, meetingVisits: [visit], actorEmployeeId: "host-1", currentFacilityId: "facility-2", now: new Date("2026-08-13T09:30:00.000Z"), scrollContainerRef: { current: null }, onExpandedChange: vi.fn(), onChanged: vi.fn().mockResolvedValue(undefined) }
    const collapsed = renderToStaticMarkup(<HostedMeetingNotificationRow {...props} isExpanded={false} />)
    const expanded = renderToStaticMarkup(<HostedMeetingNotificationRow {...props} isExpanded />)

    expect(collapsed).toContain("Ali Demir")
    expect(collapsed).toContain("Müşteri toplantısı")
    expect(collapsed).toContain("30 dk geçti")
    expect(collapsed).not.toContain("Ayşe Yılmaz")
    expect(collapsed).toContain("Genel Müdürlük")
    expect(collapsed).not.toContain("+15 dk")
    expect(expanded).toContain("+15 dk")
    expect(expanded).toContain("Toplantıyı Bitir")
  })

  it("locks the row information architecture and custom input decisions in source", () => {
    const notificationSource = readFileSync(new URL("./HostedMeetingEndNotifications.tsx", import.meta.url), "utf8")
    const actionsSource = readFileSync(new URL("./MeetingLifecycleActions.tsx", import.meta.url), "utf8")

    expect(notificationSource).toContain('hover:bg-muted/50')
    expect(notificationSource).toContain('rotate-90')
    expect(notificationSource).toContain('event.stopPropagation()')
    expect(notificationSource).toContain('overflow-x-hidden overflow-y-auto')
    expect(notificationSource).toContain('bg-slate-100 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500')
    expect(notificationSource).toContain('AlertTriangle className="size-4 shrink-0 text-amber-700"')
    expect(notificationSource).toContain('CalendarDays className="size-3 shrink-0"')
    expect(notificationSource).not.toContain('MailWarning')
    expect(notificationSource).not.toContain('CalendarClock')
    expect(notificationSource).toContain('shouldShowDifferentFacility')
    expect(notificationSource).toContain('min-w-0 truncate')
    expect(notificationSource).toContain('title={meeting.facilityName}')
    expect(notificationSource).toContain('title={visit.facilityName}')
    expect(notificationSource).toContain('Başlangıç')
    expect(notificationSource).toContain('Çıkış')
    expect(notificationSource).not.toContain('Planlanan başlangıç')
    expect(notificationSource).not.toContain('Planlanan çıkış')
    expect(notificationSource).toContain('rounded-full bg-slate-100')
    expect(notificationSource).toContain('style={{ maxHeight: "calc(100dvh - 94px)" }}')
    expect(notificationSource).not.toContain('424px')
    expect(notificationSource).toContain('className="mt-1 flex min-w-0 items-center gap-3 overflow-hidden whitespace-nowrap text-[11px] text-slate-600"')
    expect(notificationSource).toContain('className="mt-2 h-7 px-2 text-[11px]"')
    expect(notificationSource).toContain('container.scrollTop +=')
    expect(actionsSource).toContain('min={5}')
    expect(actionsSource).toContain('step={5}')
    expect(actionsSource).toContain('disabled={disabled || !isValidCustomExtensionMinutes(value)}')
    expect(actionsSource).toContain('absolute inset-y-0 right-2')
  })

  it("reports long overdue spans in hours instead of raw minutes", () => {
    const props = { meeting, meetingVisits: [visit], actorEmployeeId: "host-1", currentFacilityId: "facility-2", scrollContainerRef: { current: null }, onExpandedChange: vi.fn(), onChanged: vi.fn().mockResolvedValue(undefined), isExpanded: false }
    // Meeting ends 09:00Z; 277 minutes later is 13:37Z.
    expect(renderToStaticMarkup(<HostedMeetingNotificationRow {...props} now={new Date("2026-08-13T13:37:00.000Z")} />)).toContain("4 sa 37 dk geçti")
    expect(renderToStaticMarkup(<HostedMeetingNotificationRow {...props} now={new Date("2026-08-13T11:00:00.000Z")} />)).toContain("2 sa geçti")
    expect(renderToStaticMarkup(<HostedMeetingNotificationRow {...props} now={new Date("2026-08-13T09:00:00.000Z")} />)).toContain("Bitiş saati geldi")
  })

  it("uses the existing invitation action labels for not-sent and failed rows", () => {
    const notSent = renderToStaticMarkup(<InvitationNotificationRow visit={invitationVisit} onAction={vi.fn()} />)
    const failed = renderToStaticMarkup(<InvitationNotificationRow visit={{ ...invitationVisit, invitationStatus: "FAILED" }} onAction={vi.fn()} />)

    expect(notSent).toContain("Daveti gönder")
    expect(failed).toContain("Yeniden gönder")
    expect(failed).toContain("Gönderim başarısız")
  })

  it("selects only the current employee's not-sent and failed planned visits", () => {
    const selected = getActionRequiredInvitationVisits([
      invitationVisit,
      { ...invitationVisit, id: "visit-failed", invitationStatus: "FAILED" },
      { ...invitationVisit, id: "visit-sending", invitationStatus: "SENDING" },
      { ...invitationVisit, id: "visit-sent", invitationStatus: "SENT" },
      { ...invitationVisit, id: "visit-checked-in", status: "CHECKED_IN" },
      { ...invitationVisit, id: "visit-other-creator", creatorEmployeeId: "employee-2" },
    ], "host-1")

    expect(selected.map((item) => item.id)).toEqual(["visit-2", "visit-failed"])
    expect(getActionRequiredInvitationVisits([invitationVisit])).toEqual([])
  })

  it("dismisses sidebar notifications without changing action-required visits", () => {
    const failed = { ...invitationVisit, id: "visit-failed", invitationStatus: "FAILED" as const }
    const dismissed = new Set([invitationVisit.id])

    expect(getVisiblePendingInvitationVisits([invitationVisit, failed], dismissed).map((item) => item.id)).toEqual(["visit-failed"])
    expect(getActionRequiredInvitationVisits([invitationVisit, failed], "host-1").map((item) => item.id)).toEqual(["visit-2", "visit-failed"])
  })
})
