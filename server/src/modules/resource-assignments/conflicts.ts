import { ApiError } from "../../lib/api-error.js"

// ---------------------------------------------------------------------------
// Pure conflict / capacity math. No Prisma, no I/O. Both the service (pre-check
// for precise messages) and the repository transaction (in-tx re-check for
// race safety) run these exact functions.
// ---------------------------------------------------------------------------

export interface TimeWindow {
  plannedStart: string
  plannedEnd: string
}

export interface MeetingContext extends TimeWindow {
  id: string
  hostCompanyId: string
  facilityId: string
  actualMeetingEnd: string | null
  /** Precomputed: the Meeting has visits and every one is CHECKED_OUT / CANCELLED / NO_SHOW. */
  allVisitsTerminal: boolean
}

export interface OtherMeetingAssignments extends TimeWindow {
  id: string
  /** Closed (actualMeetingEnd set) or fully-cancelled Meetings no longer consume capacity. */
  excludedFromCapacity: boolean
  assignments: { resourceId: string; resourceType: string; requestedQuantity: number | null }[]
}

export interface NewAssignment {
  resourceId: string
  resourceType: "ROOM" | "POOLED_EQUIPMENT"
  resourceName: string
  companyId: string
  facilityId: string
  totalQuantity: number | null
  requestedQuantity: number | null
}

/** Half-open overlap: a range that ends exactly when another begins does NOT conflict. */
export function meetingsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return new Date(a.plannedStart).getTime() < new Date(b.plannedEnd).getTime()
    && new Date(a.plannedEnd).getTime() > new Date(b.plannedStart).getTime()
}

export function findRoomConflict(
  roomResourceId: string,
  target: TimeWindow,
  others: OtherMeetingAssignments[],
): OtherMeetingAssignments | null {
  return others.find((other) =>
    !other.excludedFromCapacity
    && meetingsOverlap(other, target)
    && other.assignments.some((item) => item.resourceType === "ROOM" && item.resourceId === roomResourceId),
  ) ?? null
}

export function computeUsedEquipmentQuantity(
  resourceId: string,
  target: TimeWindow,
  others: OtherMeetingAssignments[],
): number {
  return others
    .filter((other) => !other.excludedFromCapacity && meetingsOverlap(other, target))
    .reduce((sum, other) => sum + other.assignments
      .filter((item) => item.resourceType === "POOLED_EQUIPMENT" && item.resourceId === resourceId)
      .reduce((quantity, item) => quantity + (item.requestedQuantity ?? 0), 0), 0)
}

export function formatTimeRange(window: TimeWindow): string {
  const label = (iso: string) => {
    const date = new Date(iso)
    return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`
  }
  return `${label(window.plannedStart)}–${label(window.plannedEnd)}`
}

export function assertMeetingResourcesMutable(meeting: Pick<MeetingContext, "actualMeetingEnd" | "allVisitsTerminal">): void {
  if (meeting.actualMeetingEnd) {
    throw new ApiError(409, "MEETING_RESOURCES_READ_ONLY", "Kapatılmış toplantılarda kaynak atamaları değiştirilemez.")
  }
  if (meeting.allVisitsTerminal) {
    throw new ApiError(409, "MEETING_RESOURCES_READ_ONLY", "Tamamlanan ziyaretlerde kaynak atamaları değiştirilemez.")
  }
}

/**
 * Validates a complete target assignment set for a Meeting against every OTHER Meeting's
 * usage. Throws on the first violation; resolves when the whole set is safe.
 */
export function assertAssignmentSetValid(params: {
  window: TimeWindow
  facilityId: string
  others: OtherMeetingAssignments[]
  assignments: NewAssignment[]
}): void {
  const { window, facilityId, others, assignments } = params
  const rooms = assignments.filter((item) => item.resourceType === "ROOM")
  const equipment = assignments.filter((item) => item.resourceType === "POOLED_EQUIPMENT")

  if (rooms.length > 1) {
    throw new ApiError(400, "VALIDATION_ERROR", "Bir toplantıya en fazla bir oda atanabilir.")
  }
  for (const room of rooms) {
    if (room.facilityId !== facilityId) {
      throw new ApiError(400, "INVALID_SCOPE", "Oda bu toplantının tesisine ait değil.")
    }
    const conflict = findRoomConflict(room.resourceId, window, others)
    if (conflict) {
      throw new ApiError(409, "ROOM_CONFLICT", `Bu oda başka bir toplantıyla çakışıyor (${formatTimeRange(conflict)}).`)
    }
  }

  const seen = new Set<string>()
  for (const item of equipment) {
    if (!Number.isInteger(item.requestedQuantity) || (item.requestedQuantity ?? 0) <= 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "İstenen miktar pozitif bir tam sayı olmalıdır.")
    }
    if (seen.has(item.resourceId)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Aynı ekipman birden fazla kez eklenemez.")
    }
    seen.add(item.resourceId)
    if (item.facilityId !== facilityId) {
      throw new ApiError(400, "INVALID_SCOPE", `"${item.resourceName}" bu toplantının tesisine ait değil.`)
    }
    const total = item.totalQuantity ?? 0
    const used = computeUsedEquipmentQuantity(item.resourceId, window, others)
    if (used + (item.requestedQuantity ?? 0) > total) {
      throw new ApiError(
        409,
        "EQUIPMENT_CAPACITY",
        `"${item.resourceName}" kapasitesi yetersiz. Bu zaman aralığında kullanılabilir: ${total - used}/${total} adet.`,
      )
    }
  }
}

/**
 * Extension guard: the Meeting's EXISTING assignments must still be valid when its plannedEnd
 * moves to `newPlannedEnd`. Non-mutating; throws on the first violation.
 */
export function assertExtensionConflictFree(params: {
  meetingId: string
  facilityId: string
  plannedStart: string
  newPlannedEnd: string
  currentAssignments: NewAssignment[]
  others: OtherMeetingAssignments[]
}): void {
  const window: TimeWindow = { plannedStart: params.plannedStart, plannedEnd: params.newPlannedEnd }
  for (const assignment of params.currentAssignments) {
    if (assignment.resourceType === "ROOM") {
      const conflict = findRoomConflict(assignment.resourceId, window, params.others)
      if (conflict) {
        throw new ApiError(409, "ROOM_CONFLICT", `Uzatma sonrası oda başka bir toplantıyla çakışıyor (${formatTimeRange(conflict)}).`)
      }
    } else {
      const total = assignment.totalQuantity ?? 0
      const used = computeUsedEquipmentQuantity(assignment.resourceId, window, params.others)
      if (used + (assignment.requestedQuantity ?? 0) > total) {
        throw new ApiError(
          409,
          "EQUIPMENT_CAPACITY",
          `Uzatma sonrası "${assignment.resourceName}" ekipman kapasitesi yetersiz. Kullanılabilir: ${total - used}/${total} adet.`,
        )
      }
    }
  }
}
