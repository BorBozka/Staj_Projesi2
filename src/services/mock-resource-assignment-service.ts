import type {
  AssignEquipmentInput,
  AssignRoomInput,
  DesiredResourceState,
  EquipmentAssignment,
  EquipmentAssignmentView,
  EquipmentAvailabilityInfo,
  PooledEquipmentResource,
  ResourceAssignment,
  ResourceAssignmentView,
  RoomAssignment,
  RoomAssignmentView,
  RoomAvailabilityInfo,
  RoomResource,
} from "@/domain/resources"
import type { Meeting, VisitRecord } from "@/domain/visits"
import { areAllLinkedVisitsTerminal, isMeetingExplicitlyClosed, isMeetingResourceReadOnly } from "@/lib/meeting-lifecycle"
import { initialMockAssignments } from "@/services/mock-resource-assignment-data"
import type { ResourceCatalogService } from "@/services/resource-catalog-service"
import type { ResourceAssignmentService } from "@/services/resource-assignment-service"
import type { VisitService } from "@/services/visit-service"

const clone = <T,>(value: T): T => structuredClone(value)

// ---------------------------------------------------------------------------
// Availability helpers
// ---------------------------------------------------------------------------

/** Two meetings overlap when their time ranges intersect (half-open intervals). */
function meetingsOverlap(a: Meeting, b: Meeting): boolean {
  return a.plannedStart < b.plannedEnd && a.plannedEnd > b.plannedStart
}

/**
 * A meeting is considered cancelled when all its Visit records are CANCELLED.
 * We do not add a separate Meeting status field.
 */
function isMeetingCancelled(meetingId: string, visits: VisitRecord[]): boolean {
  const meetingVisits = visits.filter((v) => v.meetingId === meetingId)
  return meetingVisits.length > 0 && meetingVisits.every((v) => v.status === "CANCELLED")
}

/**
 * A meeting is considered completed (read-only for resources) when all its Visit records
 * are in terminal states (CHECKED_OUT, CANCELLED, NO_SHOW).
 * This helper is intentionally independent from explicit Meeting closure.
 */
export function isMeetingCompleted(meetingId: string, visits: VisitRecord[]): boolean {
  return areAllLinkedVisitsTerminal(meetingId, visits)
}

/**
 * Resource assignments become read-only when EITHER:
 *   a) the meeting has been explicitly closed (actualMeetingEnd is set), OR
 *   b) all visits are in terminal states (isMeetingCompleted).
 * Both conditions are checked independently so that explicit closure takes
 * effect immediately even while visitors are still checked in.
 */
function assertMeetingResourcesMutable(meeting: Meeting, visits: VisitRecord[]): void {
  if (!isMeetingResourceReadOnly(meeting, visits)) return
  if (isMeetingExplicitlyClosed(meeting)) {
    throw new Error("Kapatılmış toplantılarda kaynak atamaları değiştirilemez.")
  }
  throw new Error("Tamamlanan ziyaretlerde kaynak atamaları değiştirilemez.")
}

/**
 * Returns true when a meeting should be excluded from availability / conflict
 * calculations.  A closed meeting (actualMeetingEnd set) no longer consumes
 * room or equipment capacity.
 */
function isMeetingClosedOrCancelled(
  meeting: Meeting,
  meetingId: string,
  visits: VisitRecord[],
): boolean {
  return isMeetingExplicitlyClosed(meeting) || isMeetingCancelled(meetingId, visits)
}

// ---------------------------------------------------------------------------
// MockResourceAssignmentService
// ---------------------------------------------------------------------------

export class MockResourceAssignmentService implements ResourceAssignmentService {
  private assignments = clone(initialMockAssignments)

  constructor(
    private readonly visitService: VisitService,
    private readonly catalogService: ResourceCatalogService,
  ) {}

  // ── validateExtension ────────────────────────────────────────────────────

  async validateExtension(meetingId: string, newPlannedEnd: string): Promise<void> {
    const { meeting, visits, resources } = await this.loadContext(meetingId)
    const meetings = await this.loadMeetings()
    // Build a temporary snapshot of the target meeting with the extended end.
    const extendedMeeting: Meeting = { ...meeting, plannedEnd: newPlannedEnd }

    // Assignments from OTHER meetings (used for conflict checks).
    const otherAssignments = this.assignments.filter((a) => a.meetingId !== meetingId)

    // Check ROOM assignment.
    const roomAssignment = this.assignments.find(
      (a) => a.meetingId === meetingId && a.resourceType === "ROOM",
    )
    if (roomAssignment && resources.some((resource) => resource.id === roomAssignment.resourceId)) {
      this.checkRoomConflict(roomAssignment.resourceId, extendedMeeting, meetings, visits, otherAssignments)
    }

    // Check POOLED_EQUIPMENT assignments.
    const equipAssignments = this.assignments.filter(
      (a): a is EquipmentAssignment =>
        a.meetingId === meetingId && a.resourceType === "POOLED_EQUIPMENT",
    )
    for (const ea of equipAssignments) {
      const equip = resources.find((r) => r.id === ea.resourceId) as PooledEquipmentResource | undefined
      if (!equip) continue
      const usedQty = this.computeUsedEquipmentQuantity(
        ea.resourceId,
        extendedMeeting,
        meetings,
        visits,
        otherAssignments,
      )
      if (usedQty + ea.requestedQuantity > equip.totalQuantity) {
        const remaining = equip.totalQuantity - usedQty
        throw new Error(
          `Uzatma sonrası "${equip.name}" ekipman kapasitesi yetersiz. Kullanılabilir: ${remaining}/${equip.totalQuantity} adet.`,
        )
      }
    }
  }

  // ── list ─────────────────────────────────────────────────────────────────

  async listAssignmentsForMeeting(meetingId: string): Promise<ResourceAssignmentView[]> {
    return this.assignments
      .filter((a) => a.meetingId === meetingId)
      .map((a) => this.projectAssignment(a))
  }

  // ── assign room ──────────────────────────────────────────────────────────

  async assignRoom(meetingId: string, input: AssignRoomInput): Promise<RoomAssignmentView> {
    const { meeting, visits, resources } = await this.loadContext(meetingId)
    assertMeetingResourcesMutable(meeting, visits)
    const meetings = await this.loadMeetings()

    const room = resources.find((r) => r.id === input.resourceId && r.type === "ROOM") as RoomResource | undefined
    if (!room) throw new Error("Oda kaynağı bulunamadı.")
    if (!room.isActive) throw new Error("Atanacak oda aktif değil.")
    if (room.facilityId !== meeting.facilityId) throw new Error("Oda bu toplantının tesisine ait değil.")

    // Validate the new room before touching stored state (atomic replacement)
    this.checkRoomConflict(input.resourceId, meeting, meetings, visits, this.assignments)

    // Remove existing room assignment for this meeting (replacement is now safe)
    const existingRoomId = this.assignments.find(
      (a) => a.meetingId === meetingId && a.resourceType === "ROOM",
    )?.id
    if (existingRoomId) {
      this.assignments = this.assignments.filter((a) => a.id !== existingRoomId)
    }

    const assignment: RoomAssignment = {
      id: `assign-room-${crypto.randomUUID()}`,
      meetingId,
      resourceId: input.resourceId,
      resourceType: "ROOM",
      resourceName: room.name,
      companyId: room.companyId,
      facilityId: room.facilityId,
      createdAt: new Date().toISOString(),
    }
    this.assignments = [...this.assignments, assignment]
    return this.projectRoomAssignment(assignment)
  }

  // ── assign equipment ─────────────────────────────────────────────────────

  async assignEquipment(meetingId: string, input: AssignEquipmentInput): Promise<EquipmentAssignmentView> {
    if (!Number.isInteger(input.requestedQuantity) || input.requestedQuantity <= 0) {
      throw new Error("İstenen miktar pozitif bir tam sayı olmalıdır.")
    }

    const { meeting, visits, resources } = await this.loadContext(meetingId)
    assertMeetingResourcesMutable(meeting, visits)

    const alreadyAssigned = this.assignments.some(
      (a) => a.meetingId === meetingId && a.resourceId === input.resourceId && a.resourceType === "POOLED_EQUIPMENT",
    )
    if (alreadyAssigned) {
      throw new Error("Bu ekipman zaten atandı. Miktarını güncellemek için düzenleyin.")
    }
    const meetings = await this.loadMeetings()

    const equip = resources.find(
      (r) => r.id === input.resourceId && r.type === "POOLED_EQUIPMENT",
    ) as PooledEquipmentResource | undefined
    if (!equip) throw new Error("Ekipman havuzu bulunamadı.")
    if (!equip.isActive) throw new Error("Atanacak ekipman havuzu aktif değil.")
    if (equip.facilityId !== meeting.facilityId) throw new Error("Ekipman bu toplantının tesisine ait değil.")

    const usedQty = this.computeUsedEquipmentQuantity(
      input.resourceId,
      meeting,
      meetings,
      visits,
      this.assignments,
    )
    if (usedQty + input.requestedQuantity > equip.totalQuantity) {
      const remaining = equip.totalQuantity - usedQty
      throw new Error(
        `Ekipman havuzu kapasitesi yetersiz. Bu zaman aralığında kullanılabilir miktar: ${remaining}/${equip.totalQuantity}.`,
      )
    }

    const assignment: EquipmentAssignment = {
      id: `assign-equip-${crypto.randomUUID()}`,
      meetingId,
      resourceId: input.resourceId,
      resourceType: "POOLED_EQUIPMENT",
      resourceName: equip.name,
      companyId: equip.companyId,
      facilityId: equip.facilityId,
      totalQuantity: equip.totalQuantity,
      requestedQuantity: input.requestedQuantity,
      createdAt: new Date().toISOString(),
    }
    this.assignments = [...this.assignments, assignment]
    return this.projectEquipmentAssignment(assignment)
  }

  // ── update equipment quantity ─────────────────────────────────────────────

  async updateEquipmentAssignment(assignmentId: string, requestedQuantity: number): Promise<EquipmentAssignmentView> {
    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
      throw new Error("İstenen miktar pozitif bir tam sayı olmalıdır.")
    }

    const current = this.findAssignment(assignmentId)
    if (current.resourceType !== "POOLED_EQUIPMENT") {
      throw new Error("Bu atama bir ekipman havuzu ataması değil.")
    }

    const { meeting, visits, resources } = await this.loadContext(current.meetingId)
    assertMeetingResourcesMutable(meeting, visits)
    const meetings = await this.loadMeetings()

    const equip = resources.find((r) => r.id === current.resourceId) as PooledEquipmentResource | undefined
    if (!equip) throw new Error("Ekipman havuzu bulunamadı.")

    // Compute usage excluding THIS assignment
    const otherAssignments = this.assignments.filter((a) => a.id !== assignmentId)
    const usedQty = this.computeUsedEquipmentQuantity(
      current.resourceId,
      meeting,
      meetings,
      visits,
      otherAssignments,
    )
    if (usedQty + requestedQuantity > equip.totalQuantity) {
      const remaining = equip.totalQuantity - usedQty
      throw new Error(
        `Güncellenen miktar kapasiteyi aşıyor. Bu zaman aralığında kullanılabilir miktar: ${remaining}/${equip.totalQuantity}.`,
      )
    }

    const updated: EquipmentAssignment = { ...current, requestedQuantity }
    this.assignments = this.assignments.map((a) => (a.id === assignmentId ? updated : a))
    return this.projectEquipmentAssignment(updated)
  }

  // ── remove ───────────────────────────────────────────────────────────────

  async removeAssignment(assignmentId: string): Promise<void> {
    const current = this.findAssignment(assignmentId) // throws if not found
    const { meeting, visits } = await this.loadContext(current.meetingId)
    assertMeetingResourcesMutable(meeting, visits)
    this.assignments = this.assignments.filter((a) => a.id !== assignmentId)
  }

  // ── atomic save ──────────────────────────────────────────────────────────

  async saveMeetingAssignments(
    meetingId: string,
    desired: DesiredResourceState,
  ): Promise<ResourceAssignmentView[]> {
    const { meeting, visits, resources } = await this.loadContext(meetingId)
    assertMeetingResourcesMutable(meeting, visits)
    const meetings = await this.loadMeetings()

    // Assignments that belong to OTHER meetings — used for conflict checking.
    const otherAssignments = this.assignments.filter((a) => a.meetingId !== meetingId)

    // ── validate room ───────────────────────────────────────────────────────
    let roomResource: RoomResource | null = null
    if (desired.roomResourceId !== null) {
      const room = resources.find(
        (r) => r.id === desired.roomResourceId && r.type === "ROOM",
      ) as RoomResource | undefined
      if (!room) throw new Error("Oda kaynağı bulunamadı.")
      if (!room.isActive) throw new Error("Atanacak oda aktif değil.")
      if (room.facilityId !== meeting.facilityId) {
        throw new Error("Oda bu toplantının tesisine ait değil.")
      }
      // Check conflict against OTHER meetings only (self-assignments are being replaced).
      this.checkRoomConflict(desired.roomResourceId, meeting, meetings, visits, otherAssignments)
      roomResource = room
    }

    // ── validate equipment ──────────────────────────────────────────────────
    const uniqueResourceIds = new Set<string>()
    const validatedEquipment: { resource: PooledEquipmentResource; requestedQuantity: number }[] = []

    for (const item of desired.equipment) {
      if (!Number.isInteger(item.requestedQuantity) || item.requestedQuantity <= 0) {
        throw new Error("İstenen miktar pozitif bir tam sayı olmalıdır.")
      }
      if (uniqueResourceIds.has(item.resourceId)) {
        throw new Error("Aynı ekipman birden fazla kez eklenemez.")
      }
      uniqueResourceIds.add(item.resourceId)

      const equip = resources.find(
        (r) => r.id === item.resourceId && r.type === "POOLED_EQUIPMENT",
      ) as PooledEquipmentResource | undefined
      if (!equip) throw new Error("Ekipman havuzu bulunamadı.")
      if (!equip.isActive) throw new Error(`"${equip.name}" ekipman havuzu aktif değil.`)
      if (equip.facilityId !== meeting.facilityId) {
        throw new Error(`"${equip.name}" bu toplantının tesisine ait değil.`)
      }

      // Used quantity by OTHER meetings only (we will fully replace this meeting's assignments).
      const usedQty = this.computeUsedEquipmentQuantity(
        item.resourceId,
        meeting,
        meetings,
        visits,
        otherAssignments,
      )
      if (usedQty + item.requestedQuantity > equip.totalQuantity) {
        const remaining = equip.totalQuantity - usedQty
        throw new Error(
          `"${equip.name}" kapasitesi yetersiz. Bu zaman aralığında kullanılabilir: ${remaining}/${equip.totalQuantity} adet.`,
        )
      }
      validatedEquipment.push({ resource: equip, requestedQuantity: item.requestedQuantity })
    }

    // ── all validation passed — atomically replace this meeting's assignments ─
    const newAssignments: ResourceAssignment[] = []
    const now = new Date().toISOString()

    if (roomResource) {
      newAssignments.push({
        id: `assign-room-${crypto.randomUUID()}`,
        meetingId,
        resourceId: roomResource.id,
        resourceType: "ROOM",
        resourceName: roomResource.name,
        companyId: roomResource.companyId,
        facilityId: roomResource.facilityId,
        createdAt: now,
      } satisfies RoomAssignment)
    }

    for (const { resource, requestedQuantity } of validatedEquipment) {
      newAssignments.push({
        id: `assign-equip-${crypto.randomUUID()}`,
        meetingId,
        resourceId: resource.id,
        resourceType: "POOLED_EQUIPMENT",
        resourceName: resource.name,
        companyId: resource.companyId,
        facilityId: resource.facilityId,
        totalQuantity: resource.totalQuantity,
        requestedQuantity,
        createdAt: now,
      } satisfies EquipmentAssignment)
    }

    // Replace this meeting's slice atomically.
    this.assignments = [...otherAssignments, ...newAssignments]

    // Return projected views.
    return newAssignments.map((a) => this.projectAssignment(a))
  }

  // ── eligibility queries ──────────────────────────────────────────────────

  async getEligibleRooms(meetingId: string): Promise<RoomAvailabilityInfo[]> {
    const { meeting, visits, resources } = await this.loadContext(meetingId)
    const meetings = await this.loadMeetings()

    return resources
      .filter((r): r is RoomResource => r.type === "ROOM" && r.isActive && r.facilityId === meeting.facilityId)
      .map((room) => {
        try {
          this.checkRoomConflict(room.id, meeting, meetings, visits, this.assignments)
          return { resource: room, isAvailable: true }
        } catch (err) {
          return {
            resource: room,
            isAvailable: false,
            conflictReason: err instanceof Error ? err.message : "Çakışma var.",
          }
        }
      })
  }

  async getEligibleEquipment(meetingId: string): Promise<EquipmentAvailabilityInfo[]> {
    const { meeting, visits, resources } = await this.loadContext(meetingId)
    const meetings = await this.loadMeetings()

    return resources
      .filter(
        (r): r is PooledEquipmentResource =>
          r.type === "POOLED_EQUIPMENT" && r.isActive && r.facilityId === meeting.facilityId,
      )
      .map((equip) => {
        const usedQuantity = this.computeUsedEquipmentQuantity(
          equip.id,
          meeting,
          meetings,
          visits,
          this.assignments,
        )
        return {
          resource: equip,
          usedQuantity,
          remainingQuantity: equip.totalQuantity - usedQuantity,
        }
      })
  }

  // ── private helpers ───────────────────────────────────────────────────────

  private async loadContext(meetingId: string) {
    const [meetings, visits, resources] = await Promise.all([
      this.visitService.listMeetings(),
      this.loadVisitRecords(),
      this.catalogService.listResources(),
    ])
    const meeting = meetings.find((m) => m.id === meetingId)
    if (!meeting) throw new Error("Toplantı bulunamadı.")
    return { meeting, visits, resources, meetings }
  }

  private async loadMeetings() {
    return this.visitService.listMeetings()
  }

  /**
   * Load raw VisitRecord list for cancelled-meeting detection.
   * VisitService.listVisits() returns projected Visit objects which include
   * meeting fields — status is visit-level so they work fine.
   */
  private async loadVisitRecords() {
    return this.visitService.listVisits()
  }

  private findAssignment(id: string): ResourceAssignment {
    const a = this.assignments.find((a) => a.id === id)
    if (!a) throw new Error("Atama bulunamadı.")
    return a
  }

  /**
   * Checks whether assigning `roomId` to `targetMeeting` would conflict.
   * Throws a descriptive error if so; returns normally if safe.
   * Uses the supplied `assignments` snapshot so callers can pass a
   * tentative state for atomic replacement validation.
   */
  private checkRoomConflict(
    roomId: string,
    targetMeeting: Meeting,
    allMeetings: Meeting[],
    allVisits: { meetingId: string; status: string }[],
    assignments: ResourceAssignment[],
  ): void {
    const conflictingMeeting = allMeetings.find(
      (m) =>
        m.id !== targetMeeting.id &&
        !isMeetingClosedOrCancelled(m, m.id, allVisits as VisitRecord[]) &&
        meetingsOverlap(m, targetMeeting) &&
        assignments.some((a) => a.meetingId === m.id && a.resourceId === roomId && a.resourceType === "ROOM"),
    )
    if (conflictingMeeting) {
      throw new Error(
        `Bu oda başka bir toplantıyla çakışıyor (${formatTimeRange(conflictingMeeting)}).`,
      )
    }
  }

  /**
   * Computes total quantity of `resourceId` already assigned to meetings that
   * overlap with `targetMeeting` (excluding cancelled meetings).
   * Uses supplied `assignments` snapshot so the caller can exclude one record
   * (e.g., when updating).
   */
  private computeUsedEquipmentQuantity(
    resourceId: string,
    targetMeeting: Meeting,
    allMeetings: Meeting[],
    allVisits: { meetingId: string; status: string }[],
    assignments: ResourceAssignment[],
  ): number {
    return allMeetings
      .filter(
        (m) =>
          m.id !== targetMeeting.id &&
          !isMeetingClosedOrCancelled(m, m.id, allVisits as VisitRecord[]) &&
          meetingsOverlap(m, targetMeeting),
      )
      .reduce((sum, m) => {
        const assigned = assignments
          .filter(
            (a): a is EquipmentAssignment =>
              a.meetingId === m.id &&
              a.resourceId === resourceId &&
              a.resourceType === "POOLED_EQUIPMENT",
          )
          .reduce((qty, a) => qty + a.requestedQuantity, 0)
        return sum + assigned
      }, 0)
  }

  // ── projections ────────────────────────────────────────────────────────

  private projectAssignment(assignment: ResourceAssignment): ResourceAssignmentView {
    if (assignment.resourceType === "ROOM") {
      return this.projectRoomAssignment(assignment as RoomAssignment)
    }
    return this.projectEquipmentAssignment(assignment as EquipmentAssignment)
  }

  private projectRoomAssignment(assignment: RoomAssignment): RoomAssignmentView {
    return clone(assignment)
  }

  private projectEquipmentAssignment(assignment: EquipmentAssignment): EquipmentAssignmentView {
    return clone(assignment)
  }
}

function formatTimeRange(meeting: Meeting): string {
  const fmt = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }
  return `${fmt(meeting.plannedStart)}–${fmt(meeting.plannedEnd)}`
}
