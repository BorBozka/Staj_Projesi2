import { describe, expect, it } from "vitest"

import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import {
  getTransportPageCount,
  getVisibleTransportPageNumbers,
  paginateTransportAssignments,
  TRANSPORT_PAGE_SIZE,
} from "@/features/transport/transport-assignment-pagination"
import { initialMockTransportAssignments } from "@/services/mock-transport-assignment-data"

describe("planned transport assignment pagination", () => {
  it("shows four assignments per page", () => {
    expect(TRANSPORT_PAGE_SIZE).toBe(4)
    expect(initialMockTransportAssignments).toHaveLength(11)
    expect(paginateTransportAssignments(initialMockTransportAssignments, 1)).toHaveLength(4)
    expect(paginateTransportAssignments(initialMockTransportAssignments, 2)).toHaveLength(4)
    expect(paginateTransportAssignments(initialMockTransportAssignments, 3)).toHaveLength(3)
    expect(getTransportPageCount(initialMockTransportAssignments.length)).toBe(3)
  })

  it("returns only real page-number controls", () => {
    expect(getVisibleTransportPageNumbers(1, 4)).toEqual([1, 2, 3])
    expect(getVisibleTransportPageNumbers(4, 4)).toEqual([2, 3, 4])
    expect(getVisibleTransportPageNumbers(3, 5)).toEqual([2, 3, 4])
  })

  it("keeps pagination stable for an empty list", () => {
    expect(getTransportPageCount(0)).toBe(1)
    expect(paginateTransportAssignments([] as PlannedTransportAssignment[], 1)).toEqual([])
  })
})
