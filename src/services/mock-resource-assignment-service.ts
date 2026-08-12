import type {
  AssignEquipmentInput,
  AssignRoomInput,
  DesiredResourceState,
  EquipmentAssignment,
  EquipmentAssignmentView,
  EquipmentAvailabilityInfo,
  FacilityResource,
  PooledEquipmentResource,
  ResourceAssignment,
  ResourceAssignmentView,
  RoomAssignment,
  RoomAssignmentView,
  RoomAvailabilityInfo,
  RoomResource,
} from "@/domain/resources"
import type { Meeting, VisitRecord } from "@/domain/visits"
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
 */
export function isMeetingCompleted(meetingId: string, visits: VisitRecord[]): boolean {
  const meetingVisits = visits.filter((v) => v.meetingId === meetingId)
  if (meetingVisits.length === 0) return false
  const terminalStatuses = ["CHECKED_OUT", "CANCELLED", "NO_SHOW"]
  return meetingVisits.every((v) => terminalStatuses.includes(v.status))
}

function assertMeetingNotCompleted(meetingId: string, visits: VisitRecord[]): void {
  if (isMeetingCompleted(meetingId, visits)) {
    throw new Error("Tamamlanan ziyaretlerde kaynak atamaları değiştirilemez.")
  }
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

  // ── list ─────────────────────────────────────────────────────────────────

  async listAssignmentsForMeeting(meetingId: string): Promise<ResourceAssignmentView[]> {
    const resources = await this.catalogService.listResources()
    return this.assignments
      .filter((a) => a.meetingId === meetingId)
      .map((a) => this.projectAssignment(a, resources))
  }

  // ── assign room ──────────────────────────────────────────────────────────

  async assignRoom(meetingId: string, input: AssignRoomInput): Promise<RoomAssignmentView> {
    const { meeting, visits, resources } = await this.loadContext(meetingId)
    assertMeetingNotCompleted(meetingId, visits)
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
      createdAt: new Date().toISOString(),
    }
    this.assignments = [...this.assignments, assignment]
    return this.projectRoomAssignment(assignment, room)
  }

  // ── assign equipment ─────────────────────────────────────────────────────

  async assignEquipment(meetingId: string, input: AssignEquipmentInput): Promise<EquipmentAssignmentView> {
    if (!Number.isInteger(input.requestedQuantity) || input.requestedQuantity <= 0) {
      throw new Error("İstenen miktar pozitif bir tam sayı olmalıdır.")
    }

    const { meeting, visits, resources } = await this.loadContext(meetingId)
    assertMeetingNotCompleted(meetingId, visits)

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
      requestedQuantity: input.requestedQuantity,
      createdAt: new Date().toISOString(),
    }
    this.assignments = [...this.assignments, assignment]
    return this.projectEquipmentAssignment(assignment, equip)
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
    assertMeetingNotCompleted(current.meetingId, visits)
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
    return this.projectEquipmentAssignment(updated, equip)
  }

  // ── remove ───────────────────────────────────────────────────────────────

  async removeAssignment(assignmentId: string): Promise<void> {
    const current = this.findAssignment(assignmentId) // throws if not found
    const { visits } = await this.loadContext(current.meetingId)
    assertMeetingNotCompleted(current.meetingId, visits)
    this.assignments = this.assignments.filter((a) => a.id !== assignmentId)
  }

  // ── atomic save ──────────────────────────────────────────────────────────

  async saveMeetingAssignments(
    meetingId: string,
    desired: DesiredResourceState,
  ): Promise<ResourceAssignmentView[]> {
    const { meeting, visits, resources } = await this.loadContext(meetingId)
    assertMeetingNotCompleted(meetingId, visits)
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
        createdAt: now,
      } satisfies RoomAssignment)
    }

    for (const { resource, requestedQuantity } of validatedEquipment) {
      newAssignments.push({
        id: `assign-equip-${crypto.randomUUID()}`,
        meetingId,
        resourceId: resource.id,
        resourceType: "POOLED_EQUIPMENT",
        requestedQuantity,
        createdAt: now,
      } satisfies EquipmentAssignment)
    }

    // Replace this meeting's slice atomically.
    this.assignments = [...otherAssignments, ...newAssignments]

    // Return projected views.
    return newAssignments.map((a) => this.projectAssignment(a, resources))
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
        !isMeetingCancelled(m.id, allVisits as VisitRecord[]) &&
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
          !isMeetingCancelled(m.id, allVisits as VisitRecord[]) &&
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

  private projectAssignment(
    assignment: ResourceAssignment,
    resources: FacilityResource[],
  ): ResourceAssignmentView {
    if (assignment.resourceType === "ROOM") {
      const room = resources.find((r) => r.id === assignment.resourceId) as RoomResource | undefined
      if (!room) throw new Error(`Oda kaynağı bulunamadı: ${assignment.resourceId}`)
      return this.projectRoomAssignment(assignment as RoomAssignment, room)
    }
    const equip = resources.find((r) => r.id === assignment.resourceId) as PooledEquipmentResource | undefined
    if (!equip) throw new Error(`Ekipman kaynağı bulunamadı: ${assignment.resourceId}`)
    return this.projectEquipmentAssignment(assignment as EquipmentAssignment, equip)
  }

  private projectRoomAssignment(assignment: RoomAssignment, room: RoomResource): RoomAssignmentView {
    return {
      ...assignment,
      resourceName: room.name,
      companyId: room.companyId,
      facilityId: room.facilityId,
    }
  }

  private projectEquipmentAssignment(
    assignment: EquipmentAssignment,
    equip: PooledEquipmentResource,
  ): EquipmentAssignmentView {
    return {
      ...assignment,
      resourceName: equip.name,
      totalQuantity: equip.totalQuantity,
      companyId: equip.companyId,
      facilityId: equip.facilityId,
    }
  }
}

function formatTimeRange(meeting: Meeting): string {
  const fmt = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }
  return `${fmt(meeting.plannedStart)}–${fmt(meeting.plannedEnd)}`
}
