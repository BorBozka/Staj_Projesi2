import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import type { Meeting, Visit } from "@/domain/visits"
import { HostedMeetingEndNotifications, HostedMeetingNotificationRow } from "@/features/visits/HostedMeetingEndNotifications"
import { useVisits } from "@/features/visits/visit-context"
import { getNextExpandedMeetingId } from "@/features/visits/hosted-meeting-notifications-utils"

vi.mock("@/features/visits/visit-context", () => ({ useVisits: vi.fn() }))

const meeting: Meeting = {
  id: "meeting-1", creatorEmployeeId: "employee-1", visitTypeId: "type-1", visitTypeName: "Müşteri toplantısı",
  hostEmployeeId: "host-1", hostEmployeeName: "Ayşe Yılmaz", hostCompanyId: "company-1", hostCompanyName: "Merkez",
  facilityId: "facility-1", facilityName: "Genel Müdürlük", plannedStart: "2026-08-13T08:00:00.000Z", plannedEnd: "2026-08-13T09:00:00.000Z",
  hasAdditionalRequirements: false, createdAt: "2026-08-13T07:00:00.000Z", updatedAt: "2026-08-13T07:00:00.000Z",
}

const visit: Visit = {
  ...meeting, id: "visit-1", meetingId: meeting.id,
  visitor: { id: "visitor-1", firstName: "Ali", lastName: "Demir", email: "ali@example.com" },
  status: "CHECKED_IN", invitationStatus: "SENT", createdAt: meeting.createdAt, updatedAt: meeting.updatedAt,
}

describe("HostedMeetingEndNotifications", () => {
  it("renders a narrower panel with an accessible header toggle", () => {
    vi.mocked(useVisits).mockReturnValue({ meetings: [meeting], visits: [visit], referenceData: { currentEmployee: { employeeId: "host-1" } }, reload: vi.fn() } as never)

    const markup = renderToStaticMarkup(<HostedMeetingEndNotifications />)

    expect(markup).toContain("w-[min(350px,calc(100vw-2rem))]")
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('aria-controls="hosted-meeting-end-content"')
  })

  it("does not render a notification when all linked Visits are terminal", () => {
    vi.mocked(useVisits).mockReturnValue({
      meetings: [meeting],
      visits: [{ ...visit, status: "CANCELLED" }],
      referenceData: { currentEmployee: { employeeId: "host-1" } },
      reload: vi.fn(),
    } as never)

    expect(renderToStaticMarkup(<HostedMeetingEndNotifications />)).toBe("")
  })

  it("keeps exactly one selected meeting expanded", () => {
    expect(getNextExpandedMeetingId("meeting-1", "meeting-1")).toBeNull()
    expect(getNextExpandedMeetingId("meeting-1", "meeting-2")).toBe("meeting-2")
  })

  it("renders compact meeting details and only renders actions for the expanded row", () => {
    const props = { meeting, meetingVisits: [visit], actorEmployeeId: "host-1", now: new Date("2026-08-13T09:30:00.000Z"), onExpandedChange: vi.fn(), onChanged: vi.fn().mockResolvedValue(undefined) }
    const collapsed = renderToStaticMarkup(<HostedMeetingNotificationRow {...props} isExpanded={false} />)
    const expanded = renderToStaticMarkup(<HostedMeetingNotificationRow {...props} isExpanded />)

    expect(collapsed).toContain("Müşteri toplantısı")
    expect(collapsed).toContain("30 dk geçti")
    expect(collapsed).not.toContain("Ayşe Yılmaz")
    expect(collapsed).toContain("Genel Müdürlük")
    expect(collapsed).not.toContain("+15 dk")
    expect(expanded).toContain("+15 dk")
    expect(expanded).toContain("Toplantıyı Bitir")
  })
})
