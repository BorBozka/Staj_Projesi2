import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import type { Visit } from "@/domain/visits"
import { InsideVisits, NextVisits } from "@/features/manager/ManagerDashboard"

const visit: Visit = {
  id: "visit-next",
  meetingId: "meeting-next",
  creatorEmployeeId: "creator-1",
  visitor: {
    id: "visitor-next",
    firstName: "Ayça",
    lastName: "Korkmaz",
    email: "ayca@example.com",
  },
  visitTypeId: "meeting",
  visitTypeName: "Toplantı",
  hostEmployeeId: "host-1",
  hostEmployeeName: "Maya Kara",
  hostCompanyId: "bplas",
  hostCompanyName: "BPLAS A.Ş.",
  facilityId: "bplas-merkez",
  facilityName: "Merkez Tesis",
  plannedStart: "2026-08-13T13:00:00+03:00",
  plannedEnd: "2026-08-13T14:00:00+03:00",
  status: "PLANNED",
  invitationStatus: "SENT",
  hasAdditionalRequirements: false,
  createdAt: "2026-08-13T08:00:00+03:00",
  updatedAt: "2026-08-13T08:00:00+03:00",
}

describe("ManagerDashboard next visits UI", () => {
  it("renders each upcoming visit as a detail-opening button while preserving the all-visits link", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <NextVisits
          visits={[visit]}
          total={1}
          now={new Date("2026-08-13T10:00:00+03:00")}
          onVisitOpen={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(markup).toContain("Ayça Korkmaz ziyaret detaylarını aç")
    expect(markup).toContain("<button")
    expect(markup).toContain("Tümünü gör")
    expect(markup).toContain("/manager/all-visits?date=2026-08-13&amp;status=PLANNED")
  })
})

describe("ManagerDashboard inside visits UI", () => {
  it("renders each inside row as a detail-opening keyboard-accessible control", () => {
    const markup = renderToStaticMarkup(
      <InsideVisits visits={[{ ...visit, status: "CHECKED_IN", actualCheckIn: "2026-08-13T13:05:00+03:00" }]} now={new Date("2026-08-13T13:30:00+03:00")} controls={<span />} onVisitOpen={vi.fn()} />,
    )

    expect(markup).toContain('role="button"')
    expect(markup).toContain("aria-label=")
  })
})
