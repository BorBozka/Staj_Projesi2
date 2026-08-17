import { describe, expect, it } from "vitest"

import { getTransportAssignmentEditValues } from "@/features/transport/transport-assignment-edit-values"
import { initialMockTransportAssignments } from "@/services/mock-transport-assignment-data"

describe("transport assignment edit values", () => {
  it("preserves every editable assignment field when detail switches to edit mode", () => {
    const assignment = {
      ...initialMockTransportAssignments[0],
      relatedMeetingId: "meeting-1",
    }

    expect(getTransportAssignmentEditValues(assignment)).toEqual({
      companyId: assignment.companyId,
      facilityId: assignment.facilityId,
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      startTime: expect.stringMatching(/^\d{2}:\d{2}$/),
      endTime: expect.stringMatching(/^\d{2}:\d{2}$/),
      purpose: assignment.purpose,
      vehicleResourceId: assignment.vehicleResourceId,
      driverResourceId: assignment.driverResourceId,
      relatedKind: "meeting",
      relatedId: "meeting-1",
    })
  })
})
