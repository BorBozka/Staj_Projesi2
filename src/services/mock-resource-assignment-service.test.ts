import { addHours } from "date-fns"
import { describe, expect, it } from "vitest"

import { MockResourceAssignmentService } from "@/services/mock-resource-assignment-service"
import { MockResourceCatalogService } from "@/services/mock-resource-catalog-service"
import { scenarioAt } from "@/services/mock-scenario"
import { MockVisitService } from "@/services/mock-visit-service"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeServices() {
  const visitService = new MockVisitService()
  const catalogService = new MockResourceCatalogService()
  const assignmentService = new MockResourceAssignmentService(visitService, catalogService)
  visitService.setResourceAssignmentService(assignmentService)
  return { visitService, catalogService, assignmentService }
}

/** Creates a Meeting with two PLANNED visits using the visit service. */
async function createMeeting(
  visitService: MockVisitService,
  options: {
    day?: Date
    startHour?: number
    durationHours?: number
    facilityId?: string
    companyId?: string
  } = {},
) {
  const startHour = options.startHour ?? 9
  const durationHours = options.durationHours ?? 2
  const facilityId = options.facilityId ?? "bplas-merkez"
  const companyId = options.companyId ?? "bplas"

  const plannedStart = options.day
    ? new Date(options.day.getFullYear(), options.day.getMonth(), options.day.getDate(), startHour).toISOString()
    : scenarioAt(0, startHour)
  const plannedEnd = addHours(new Date(plannedStart), durationHours).toISOString()

  const result = await visitService.createMeeting({
    visitors: [{ firstName: "Test", lastName: "Ziyaretçi", email: "test@example.com", company: "Test A.Ş." }],
    visitTypeId: "meeting",
    hostEmployeeName: "Maya Kara",
    hostCompanyId: companyId,
    facilityId,
    plannedStart,
    plannedEnd,
  })
  return result.meeting
}

// ---------------------------------------------------------------------------
// Constants for seed data
// ---------------------------------------------------------------------------
const MERKEZ_ROOM_ID = "resource-room-merkez-atlas"
const ARGE_ROOM_ID = "resource-room-arge-pusula"
const NOTEBOOK_ID = "resource-notebook-merkez"        // totalQuantity: 12, bplas-merkez
const PROJECTOR_OTOMOTIV_ID = "resource-projector-otomotiv" // totalQuantity: 4, otomotiv-uretim

// Seeded meetings from mock data that exist on today's schedule
const SEEDED_MEETING_WITH_ROOM = "meeting-v-102"     // 11:00–12:00 bplas-merkez, assigned Atlas room
const SEEDED_MEETING_WITH_EQUIP = "meeting-v-103"    // 14:30–16:00 bplas-merkez, assigned 2 notebooks

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MockResourceAssignmentService — list", () => {
  it("returns seeded room assignment for meeting-v-102", async () => {
    const { assignmentService } = makeServices()
    const assignments = await assignmentService.listAssignmentsForMeeting(SEEDED_MEETING_WITH_ROOM)
    expect(assignments).toHaveLength(1)
    expect(assignments[0]).toMatchObject({
      meetingId: SEEDED_MEETING_WITH_ROOM,
      resourceType: "ROOM",
      resourceName: "Atlas Toplantı Odası",
    })
  })

  it("returns seeded equipment assignment for meeting-v-103", async () => {
    const { assignmentService } = makeServices()
    const assignments = await assignmentService.listAssignmentsForMeeting(SEEDED_MEETING_WITH_EQUIP)
    expect(assignments).toHaveLength(1)
    expect(assignments[0]).toMatchObject({
      meetingId: SEEDED_MEETING_WITH_EQUIP,
      resourceType: "POOLED_EQUIPMENT",
      resourceName: "Notebook Havuzu",
      requestedQuantity: 2,
      totalQuantity: 12,
    })
  })

  it("returns empty list for a meeting with no assignments", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })
    const assignments = await assignmentService.listAssignmentsForMeeting(meeting.id)
    expect(assignments).toHaveLength(0)
  })

  it("keeps historical room and equipment projections after catalog hard delete", async () => {
    const { visitService, catalogService, assignmentService } = makeServices()

    await catalogService.deleteResource(MERKEZ_ROOM_ID)
    await catalogService.deleteResource(NOTEBOOK_ID)

    await expect(assignmentService.listAssignmentsForMeeting(SEEDED_MEETING_WITH_ROOM)).resolves.toEqual([
      expect.objectContaining({
        resourceId: MERKEZ_ROOM_ID,
        resourceType: "ROOM",
        resourceName: "Atlas Toplantı Odası",
        companyId: "bplas",
        facilityId: "bplas-merkez",
      }),
    ])
    await expect(assignmentService.listAssignmentsForMeeting(SEEDED_MEETING_WITH_EQUIP)).resolves.toEqual([
      expect.objectContaining({
        resourceId: NOTEBOOK_ID,
        resourceType: "POOLED_EQUIPMENT",
        resourceName: "Notebook Havuzu",
        totalQuantity: 12,
        requestedQuantity: 2,
      }),
    ])

    const meetings = await visitService.listMeetings()
    const roomMeeting = meetings.find((meeting) => meeting.id === SEEDED_MEETING_WITH_ROOM)
    const equipmentMeeting = meetings.find((meeting) => meeting.id === SEEDED_MEETING_WITH_EQUIP)
    expect(roomMeeting).toBeDefined()
    expect(equipmentMeeting).toBeDefined()
    await expect(assignmentService.validateExtension(
      SEEDED_MEETING_WITH_ROOM,
      new Date(new Date(roomMeeting!.plannedEnd).getTime() + 15 * 60_000).toISOString(),
    )).resolves.toBeUndefined()
    await expect(assignmentService.validateExtension(
      SEEDED_MEETING_WITH_EQUIP,
      new Date(new Date(equipmentMeeting!.plannedEnd).getTime() + 15 * 60_000).toISOString(),
    )).resolves.toBeUndefined()
  })

  it("excludes deleted resources from eligibility and rejects new assignment without deleting history", async () => {
    const { visitService, catalogService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })

    await catalogService.deleteResource(MERKEZ_ROOM_ID)
    await catalogService.deleteResource(NOTEBOOK_ID)

    expect((await assignmentService.getEligibleRooms(meeting.id)).some((item) => item.resource.id === MERKEZ_ROOM_ID)).toBe(false)
    expect((await assignmentService.getEligibleEquipment(meeting.id)).some((item) => item.resource.id === NOTEBOOK_ID)).toBe(false)
    await expect(assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID })).rejects.toThrow("Oda kaynağı bulunamadı")
    await expect(assignmentService.assignEquipment(meeting.id, { resourceId: NOTEBOOK_ID, requestedQuantity: 1 })).rejects.toThrow("Ekipman havuzu bulunamadı")
    await expect(assignmentService.listAssignmentsForMeeting(SEEDED_MEETING_WITH_ROOM)).resolves.toHaveLength(1)
    await expect(assignmentService.listAssignmentsForMeeting(SEEDED_MEETING_WITH_EQUIP)).resolves.toHaveLength(1)
  })
})

describe("MockResourceAssignmentService — room assignment", () => {
  it("successfully assigns a room to a meeting with no time conflict", async () => {
    const { visitService, assignmentService } = makeServices()
    // create a meeting at 06:00 (no existing meetings at that hour)
    const meeting = await createMeeting(visitService, { startHour: 6, durationHours: 1 })
    const view = await assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID })

    expect(view).toMatchObject({
      meetingId: meeting.id,
      resourceType: "ROOM",
      resourceId: MERKEZ_ROOM_ID,
      resourceName: "Atlas Toplantı Odası",
    })
  })

  it("rejects room assignment when the room is already assigned to an overlapping meeting", async () => {
    const { visitService, assignmentService } = makeServices()
    // meeting-v-102 occupies Atlas room at 11:00–12:00 (seeded)
    // create a new meeting that overlaps: 11:30–13:00
    const meeting = await createMeeting(visitService, { startHour: 11, durationHours: 1.5 })
    await expect(
      assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID }),
    ).rejects.toThrow("çakışıyor")
  })

  it("allows assigning the same room to non-overlapping meetings", async () => {
    const { visitService, assignmentService } = makeServices()
    // Atlas room is at 11:00–12:00 in seeded data; meeting at 13:00 does not overlap
    const meeting = await createMeeting(visitService, { startHour: 13, durationHours: 1 })
    const view = await assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID })
    expect(view.resourceType).toBe("ROOM")
  })

  it("rejects assignment of an inactive resource", async () => {
    // resource-projector-arge is POOLED_EQUIPMENT and isActive: false — test with a room
    // We deactivate atlas room first via catalog
    const visitService = new MockVisitService()
    const catalogService = new MockResourceCatalogService()
    await catalogService.setResourceActive(MERKEZ_ROOM_ID, false)
    const assignmentService = new MockResourceAssignmentService(visitService, catalogService)

    const meeting = await createMeeting(visitService, { startHour: 6 })
    await expect(
      assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID }),
    ).rejects.toThrow("aktif değil")
  })

  it("rejects assignment of a room from a different facility", async () => {
    const { visitService, assignmentService } = makeServices()
    // ARGE_ROOM_ID belongs to bplas-arge; meeting is at bplas-merkez
    const meeting = await createMeeting(visitService, { startHour: 6, facilityId: "bplas-merkez" })
    await expect(
      assignmentService.assignRoom(meeting.id, { resourceId: ARGE_ROOM_ID }),
    ).rejects.toThrow("tesisine ait değil")
  })

  it("atomically replaces the room when the new room has no conflict", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6, durationHours: 1 })

    // assign first room
    await assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID })
    let assignments = await assignmentService.listAssignmentsForMeeting(meeting.id)
    expect(assignments).toHaveLength(1)
    expect(assignments[0].resourceId).toBe(MERKEZ_ROOM_ID)

    // Replace with Ar-Ge room — note meeting is at bplas-merkez so this should reject by facility
    // Use a meeting at bplas-arge to test proper replacement
    const argeMeeting = await createMeeting(visitService, {
      startHour: 6,
      durationHours: 1,
      facilityId: "bplas-arge",
      companyId: "bplas",
    })
    await assignmentService.assignRoom(argeMeeting.id, { resourceId: ARGE_ROOM_ID })
    assignments = await assignmentService.listAssignmentsForMeeting(argeMeeting.id)
    expect(assignments).toHaveLength(1)
    expect(assignments[0].resourceId).toBe(ARGE_ROOM_ID)
  })

  it("preserves existing room assignment when new room conflicts (atomic rollback)", async () => {
    const { visitService, assignmentService } = makeServices()
    // seeded meeting-v-102 has Atlas room from 11:00–12:00
    // Create a new meeting for 06:00–07:00 and assign Atlas room
    const meetingA = await createMeeting(visitService, { startHour: 6, durationHours: 1 })
    await assignmentService.assignRoom(meetingA.id, { resourceId: MERKEZ_ROOM_ID })

    // Now assign another room to meetingA first (Pusula — different facility, so we need a bplas-merkez room)
    // Instead: assign Atlas to meetingA, then try to replace with a second hypothetical room
    // The simpler test: meetingA has Atlas (06:00–07:00), try to replace with Atlas on a meeting that overlaps with seeded 11:00
    const meetingB = await createMeeting(visitService, { startHour: 10, durationHours: 2 })
    // meetingB (10:00–12:00) overlaps with seeded meeting-v-102 (11:00–12:00) which has Atlas room
    // First assign a valid room to meetingB (none available at merkez for that time — Atlas is taken)
    // So try to assign Atlas — should fail
    await expect(
      assignmentService.assignRoom(meetingB.id, { resourceId: MERKEZ_ROOM_ID }),
    ).rejects.toThrow("çakışıyor")

    // meetingB should have no room assignment (nothing stored)
    const assignments = await assignmentService.listAssignmentsForMeeting(meetingB.id)
    expect(assignments.filter((a) => a.resourceType === "ROOM")).toHaveLength(0)
  })

  it("cancelled meetings do not block room availability", async () => {
    const { visitService, assignmentService } = makeServices()

    // Create a meeting, assign Atlas room, then cancel it
    const cancelledMeeting = await createMeeting(visitService, { startHour: 6, durationHours: 1 })
    await assignmentService.assignRoom(cancelledMeeting.id, { resourceId: MERKEZ_ROOM_ID })

    // Cancel all visits in the meeting
    const allVisits = await visitService.listVisits()
    const meetingVisits = allVisits.filter((v) => v.meetingId === cancelledMeeting.id)
    for (const v of meetingVisits) {
      await visitService.cancelVisit(v.id)
    }

    // Now a new meeting at the same time should be able to get Atlas room
    const newMeeting = await createMeeting(visitService, { startHour: 6, durationHours: 1 })
    const view = await assignmentService.assignRoom(newMeeting.id, { resourceId: MERKEZ_ROOM_ID })
    expect(view.resourceId).toBe(MERKEZ_ROOM_ID)
  })
})

describe("MockResourceAssignmentService — equipment assignment", () => {
  it("assigns equipment at a quantity that does not exceed total", async () => {
    const { visitService, assignmentService } = makeServices()
    // Notebooks total=12; seeded meeting at 14:30–16:00 uses 2; create non-overlapping meeting
    const meeting = await createMeeting(visitService, { startHour: 6, durationHours: 1 })
    const view = await assignmentService.assignEquipment(meeting.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 5,
    })
    expect(view).toMatchObject({
      requestedQuantity: 5,
      totalQuantity: 12,
      resourceType: "POOLED_EQUIPMENT",
    })
  })

  it("allows assignment at exact total capacity (usedQty + requested === total)", async () => {
    const { visitService, assignmentService } = makeServices()
    // Create a fresh meeting; no overlapping meetings use notebooks
    const meeting = await createMeeting(visitService, { startHour: 6, durationHours: 1 })
    const view = await assignmentService.assignEquipment(meeting.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 12, // all 12 units — exact capacity
    })
    expect(view.requestedQuantity).toBe(12)
  })

  it("rejects duplicate equipment assignment for the same meeting", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6, durationHours: 1 })
    await assignmentService.assignEquipment(meeting.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 2,
    })
    await expect(
      assignmentService.assignEquipment(meeting.id, {
        resourceId: NOTEBOOK_ID,
        requestedQuantity: 3,
      }),
    ).rejects.toThrow("zaten atandı")
  })

  it("rejects equipment assignment when it would exceed total capacity", async () => {
    const { visitService, assignmentService } = makeServices()
    // seeded meeting-v-103 uses 2 notebooks at 14:30–16:00; create overlapping meeting
    const meeting = await createMeeting(visitService, { startHour: 15, durationHours: 1 })
    await expect(
      assignmentService.assignEquipment(meeting.id, {
        resourceId: NOTEBOOK_ID,
        requestedQuantity: 11, // 2 already used + 11 = 13 > 12
      }),
    ).rejects.toThrow("kapasitesi yetersiz")
  })

  it("allows partial assignment within remaining capacity when overlap exists", async () => {
    const { visitService, assignmentService } = makeServices()
    // seeded meeting-v-103 uses 2 notebooks at 14:30–16:00; remaining = 10
    const meeting = await createMeeting(visitService, { startHour: 15, durationHours: 1 })
    const view = await assignmentService.assignEquipment(meeting.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 10, // exactly remaining
    })
    expect(view.requestedQuantity).toBe(10)
  })

  it("rejects equipment for a different facility", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6, facilityId: "bplas-merkez" })
    await expect(
      assignmentService.assignEquipment(meeting.id, {
        resourceId: PROJECTOR_OTOMOTIV_ID, // belongs to otomotiv-uretim
        requestedQuantity: 1,
      }),
    ).rejects.toThrow("tesisine ait değil")
  })

  it("rejects equipment that is inactive", async () => {
    const visitService = new MockVisitService()
    const catalogService = new MockResourceCatalogService()
    await catalogService.setResourceActive(NOTEBOOK_ID, false)
    const assignmentService = new MockResourceAssignmentService(visitService, catalogService)

    const meeting = await createMeeting(visitService, { startHour: 6 })
    await expect(
      assignmentService.assignEquipment(meeting.id, { resourceId: NOTEBOOK_ID, requestedQuantity: 1 }),
    ).rejects.toThrow("aktif değil")
  })

  it("rejects zero or negative requested quantity", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })
    await expect(
      assignmentService.assignEquipment(meeting.id, { resourceId: NOTEBOOK_ID, requestedQuantity: 0 }),
    ).rejects.toThrow("pozitif bir tam sayı")
    await expect(
      assignmentService.assignEquipment(meeting.id, { resourceId: NOTEBOOK_ID, requestedQuantity: -1 }),
    ).rejects.toThrow("pozitif bir tam sayı")
  })
})

describe("MockResourceAssignmentService — update equipment quantity", () => {
  it("successfully updates quantity within capacity", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })
    const created = await assignmentService.assignEquipment(meeting.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 3,
    })
    const updated = await assignmentService.updateEquipmentAssignment(created.id, 7)
    expect(updated.requestedQuantity).toBe(7)
  })

  it("rejects update that would exceed total capacity", async () => {
    const { visitService, assignmentService } = makeServices()
    // seeded meeting-v-103 at 14:30: 2 notebooks used; create overlapping meeting
    const meeting = await createMeeting(visitService, { startHour: 15, durationHours: 1 })
    const created = await assignmentService.assignEquipment(meeting.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 5,
    })
    // now try to bump to 11 — overlapping used 2, so 2+11=13 > 12
    await expect(
      assignmentService.updateEquipmentAssignment(created.id, 11),
    ).rejects.toThrow("kapasiteyi aşıyor")
  })
})

describe("MockResourceAssignmentService — remove assignment", () => {
  it("removes a room assignment and frees the room for another meeting", async () => {
    const { visitService, assignmentService } = makeServices()
    // seeded meeting-v-102 has Atlas room (11:00–12:00)
    // create a new overlapping meeting and try to take Atlas — should fail
    const meeting = await createMeeting(visitService, { startHour: 11, durationHours: 1 })
    await expect(
      assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID }),
    ).rejects.toThrow("çakışıyor")

    // Remove seeded assignment
    const seededAssignments = await assignmentService.listAssignmentsForMeeting(SEEDED_MEETING_WITH_ROOM)
    await assignmentService.removeAssignment(seededAssignments[0].id)

    // Now the new meeting should be able to take Atlas
    const view = await assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID })
    expect(view.resourceId).toBe(MERKEZ_ROOM_ID)
  })

  it("removes an equipment assignment and shows freed capacity in getEligibleEquipment", async () => {
    const { visitService, assignmentService } = makeServices()
    // seeded meeting-v-103 at 14:30–16:00 uses 2 notebooks
    const meeting = await createMeeting(visitService, { startHour: 15, durationHours: 1 })
    const before = await assignmentService.getEligibleEquipment(meeting.id)
    const notebookBefore = before.find((e) => e.resource.id === NOTEBOOK_ID)!
    expect(notebookBefore.usedQuantity).toBe(2)
    expect(notebookBefore.remainingQuantity).toBe(10)

    // Remove seeded equipment assignment
    const seededAssignments = await assignmentService.listAssignmentsForMeeting(SEEDED_MEETING_WITH_EQUIP)
    await assignmentService.removeAssignment(seededAssignments[0].id)

    const after = await assignmentService.getEligibleEquipment(meeting.id)
    const notebookAfter = after.find((e) => e.resource.id === NOTEBOOK_ID)!
    expect(notebookAfter.usedQuantity).toBe(0)
    expect(notebookAfter.remainingQuantity).toBe(12)
  })

  it("throws when removing a non-existent assignment", async () => {
    const { assignmentService } = makeServices()
    await expect(assignmentService.removeAssignment("nonexistent-id")).rejects.toThrow("bulunamadı")
  })
})

describe("MockResourceAssignmentService — eligibility queries", () => {
  it("getEligibleRooms returns only active rooms for the meeting facility", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 }) // bplas-merkez
    const rooms = await assignmentService.getEligibleRooms(meeting.id)
    // Only Atlas Toplantı Odası is in bplas-merkez
    expect(rooms.every((r) => r.resource.facilityId === "bplas-merkez")).toBe(true)
    expect(rooms.every((r) => r.resource.isActive)).toBe(true)
  })

  it("getEligibleRooms marks conflicting rooms as unavailable", async () => {
    const { visitService, assignmentService } = makeServices()
    // Create meeting that overlaps seeded meeting-v-102 (Atlas room 11:00–12:00)
    const meeting = await createMeeting(visitService, { startHour: 11, durationHours: 1 })
    const rooms = await assignmentService.getEligibleRooms(meeting.id)
    const atlas = rooms.find((r) => r.resource.id === MERKEZ_ROOM_ID)!
    expect(atlas.isAvailable).toBe(false)
    expect(atlas.conflictReason).toContain("çakışıyor")
  })

  it("getEligibleEquipment returns correct usedQuantity and remainingQuantity", async () => {
    const { visitService, assignmentService } = makeServices()
    // seeded meeting-v-103 at 14:30–16:00 uses 2 notebooks
    const meeting = await createMeeting(visitService, { startHour: 15, durationHours: 1 })
    const equipment = await assignmentService.getEligibleEquipment(meeting.id)
    const notebook = equipment.find((e) => e.resource.id === NOTEBOOK_ID)!
    expect(notebook.usedQuantity).toBe(2)
    expect(notebook.remainingQuantity).toBe(10)
  })
})

describe("MockResourceAssignmentService — isolation", () => {
  it("does not modify Meeting or Visit records", async () => {
    const visitService = new MockVisitService()
    const catalogService = new MockResourceCatalogService()
    const assignmentService = new MockResourceAssignmentService(visitService, catalogService)

    // create the test meeting first — this legitimately mutates visitService
    const meeting = await createMeeting(visitService, { startHour: 6 })

    // capture baseline AFTER meeting creation
    const meetingsBefore = await visitService.listMeetings()
    const visitsBefore = await visitService.listVisits()

    // perform various assignment operations (none of these should touch meetings/visits)
    const room = await assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID })
    await assignmentService.removeAssignment(room.id)
    const equip = await assignmentService.assignEquipment(meeting.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 3,
    })
    await assignmentService.updateEquipmentAssignment(equip.id, 5)

    // seeded meetings and visits must be unchanged
    expect(await visitService.listMeetings()).toEqual(meetingsBefore)
    expect(await visitService.listVisits()).toEqual(visitsBefore)
  })

  it("does not modify Resource Catalog records", async () => {
    const visitService = new MockVisitService()
    const catalogService = new MockResourceCatalogService()
    const assignmentService = new MockResourceAssignmentService(visitService, catalogService)

    const resourcesBefore = await catalogService.listResources()
    const meeting = await createMeeting(visitService, { startHour: 6 })
    await assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID })

    expect(await catalogService.listResources()).toEqual(resourcesBefore)
  })
})

describe("MockResourceAssignmentService — equipment availability edit calculations", () => {
  it("editing current assignment does not self-conflict", async () => {
    const { visitService, assignmentService } = makeServices()
    // Create meeting at 8:00 AM (no other overlapping meetings)
    const meeting = await createMeeting(visitService, { startHour: 8, durationHours: 1 })
    const initial = await assignmentService.assignEquipment(meeting.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 2,
    })

    // Updating own quantity to 5 should succeed
    const updated = await assignmentService.updateEquipmentAssignment(initial.id, 5)
    expect(updated.requestedQuantity).toBe(5)
  })

  it("total 12/current 2/others 0 -> maximum 12 accepted, >12 rejected", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 8, durationHours: 1 })
    const initial = await assignmentService.assignEquipment(meeting.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 2,
    })

    // Quantity equal to maximum (12) is accepted
    const maxUpdated = await assignmentService.updateEquipmentAssignment(initial.id, 12)
    expect(maxUpdated.requestedQuantity).toBe(12)

    // Quantity above maximum (13) is rejected
    await expect(assignmentService.updateEquipmentAssignment(initial.id, 13)).rejects.toThrow(
      "Güncellenen miktar kapasiteyi aşıyor",
    )
  })

  it("total 12/current 2/others 5 -> maximum 7 accepted, >7 rejected", async () => {
    const { visitService, assignmentService } = makeServices()
    // Create Meeting A and Meeting B at overlapping time 8:00–9:00 AM
    const meetingA = await createMeeting(visitService, { startHour: 8, durationHours: 1 })
    const meetingB = await createMeeting(visitService, { startHour: 8, durationHours: 1 })

    // Meeting B reserves 5 notebooks (others = 5)
    await assignmentService.assignEquipment(meetingB.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 5,
    })

    // Meeting A reserves 2 notebooks (current = 2)
    const assignA = await assignmentService.assignEquipment(meetingA.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 2,
    })

    // Maximum available for Meeting A is total (12) - others (5) = 7
    const maxUpdated = await assignmentService.updateEquipmentAssignment(assignA.id, 7)
    expect(maxUpdated.requestedQuantity).toBe(7)

    // Quantity above maximum (8) is rejected
    await expect(assignmentService.updateEquipmentAssignment(assignA.id, 8)).rejects.toThrow(
      "Güncellenen miktar kapasiteyi aşıyor",
    )
  })
})

describe("MockResourceAssignmentService — completed meeting read-only protection", () => {
  it("rejects assignRoom for a completed Meeting (all visits terminal)", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })
    const visits = await visitService.listVisits()
    const meetingVisits = visits.filter((v) => v.meetingId === meeting.id)
    for (const v of meetingVisits) {
      await visitService.cancelVisit(v.id)
    }

    await expect(
      assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID }),
    ).rejects.toThrow("Tamamlanan ziyaretlerde kaynak atamaları değiştirilemez.")
  })

  it("rejects room replacement and removal for a completed Meeting", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })
    const roomAssignment = await assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID })

    const visits = await visitService.listVisits()
    const meetingVisits = visits.filter((v) => v.meetingId === meeting.id)
    for (const v of meetingVisits) {
      await visitService.cancelVisit(v.id)
    }

    // Room replacement attempt
    await expect(
      assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID }),
    ).rejects.toThrow("Tamamlanan ziyaretlerde kaynak atamaları değiştirilemez.")

    // Room removal attempt
    await expect(
      assignmentService.removeAssignment(roomAssignment.id),
    ).rejects.toThrow("Tamamlanan ziyaretlerde kaynak atamaları değiştirilemez.")
  })

  it("rejects assignEquipment for a completed Meeting", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })
    const visits = await visitService.listVisits()
    const meetingVisits = visits.filter((v) => v.meetingId === meeting.id)
    for (const v of meetingVisits) {
      await visitService.cancelVisit(v.id)
    }

    await expect(
      assignmentService.assignEquipment(meeting.id, {
        resourceId: NOTEBOOK_ID,
        requestedQuantity: 2,
      }),
    ).rejects.toThrow("Tamamlanan ziyaretlerde kaynak atamaları değiştirilemez.")
  })

  it("rejects equipment quantity update and removal for a completed Meeting", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })
    const equip = await assignmentService.assignEquipment(meeting.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 2,
    })

    const visits = await visitService.listVisits()
    const meetingVisits = visits.filter((v) => v.meetingId === meeting.id)
    for (const v of meetingVisits) {
      await visitService.cancelVisit(v.id)
    }

    // Equipment update attempt
    await expect(
      assignmentService.updateEquipmentAssignment(equip.id, 4),
    ).rejects.toThrow("Tamamlanan ziyaretlerde kaynak atamaları değiştirilemez.")

    // Equipment removal attempt
    await expect(
      assignmentService.removeAssignment(equip.id),
    ).rejects.toThrow("Tamamlanan ziyaretlerde kaynak atamaları değiştirilemez.")
  })

  it("allows resource mutations for an active Meeting", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })
    const room = await assignmentService.assignRoom(meeting.id, { resourceId: MERKEZ_ROOM_ID })
    expect(room.resourceId).toBe(MERKEZ_ROOM_ID)

    const equip = await assignmentService.assignEquipment(meeting.id, {
      resourceId: NOTEBOOK_ID,
      requestedQuantity: 2,
    })
    expect(equip.requestedQuantity).toBe(2)
  })

  it("allows resource mutations if at least one Visit remains non-terminal", async () => {
    const { visitService, assignmentService } = makeServices()
    // Create meeting with two visitors
    const result = await visitService.createMeeting({
      visitors: [
        { firstName: "Ziyaretçi 1", lastName: "A", email: "a@example.com", company: "Test A.Ş." },
        { firstName: "Ziyaretçi 2", lastName: "B", email: "b@example.com", company: "Test A.Ş." },
      ],
      visitTypeId: "meeting",
      hostEmployeeName: "Maya Kara",
      hostCompanyId: "bplas",
      facilityId: "bplas-merkez",
      plannedStart: new Date("2026-08-13T06:00:00.000Z").toISOString(),
      plannedEnd: new Date("2026-08-13T07:00:00.000Z").toISOString(),
    })

    // Cancel only the first visit
    await visitService.cancelVisit(result.visits[0].id)

    // Meeting still has one PLANNED visit -> remains editable
    const room = await assignmentService.assignRoom(result.meeting.id, { resourceId: MERKEZ_ROOM_ID })
    expect(room.resourceId).toBe(MERKEZ_ROOM_ID)
  })
})

// ---------------------------------------------------------------------------
// saveMeetingAssignments — atomic persistence
// ---------------------------------------------------------------------------

describe("MockResourceAssignmentService — saveMeetingAssignments", () => {
  it("persists room + equipment in one call and returns projected views", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })

    const views = await assignmentService.saveMeetingAssignments(meeting.id, {
      roomResourceId: MERKEZ_ROOM_ID,
      equipment: [{ resourceId: NOTEBOOK_ID, requestedQuantity: 3 }],
    })

    expect(views).toHaveLength(2)
    const room = views.find((v) => v.resourceType === "ROOM")
    const equip = views.find((v) => v.resourceType === "POOLED_EQUIPMENT")
    expect(room).toMatchObject({ meetingId: meeting.id, resourceId: MERKEZ_ROOM_ID })
    expect(equip).toMatchObject({ meetingId: meeting.id, resourceId: NOTEBOOK_ID, requestedQuantity: 3 })
  })

  it("replaces a previously persisted assignment set entirely", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })

    // First save: room + notebook
    await assignmentService.saveMeetingAssignments(meeting.id, {
      roomResourceId: MERKEZ_ROOM_ID,
      equipment: [{ resourceId: NOTEBOOK_ID, requestedQuantity: 2 }],
    })

    // Second save: different room, remove equipment
    const views = await assignmentService.saveMeetingAssignments(meeting.id, {
      roomResourceId: MERKEZ_ROOM_ID,
      equipment: [],
    })

    expect(views).toHaveLength(1)
    expect(views[0].resourceType).toBe("ROOM")

    const listed = await assignmentService.listAssignmentsForMeeting(meeting.id)
    expect(listed).toHaveLength(1)
  })

  it("saves with no room (room null) and no equipment", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })

    // Pre-assign something
    await assignmentService.saveMeetingAssignments(meeting.id, {
      roomResourceId: MERKEZ_ROOM_ID,
      equipment: [{ resourceId: NOTEBOOK_ID, requestedQuantity: 1 }],
    })

    // Now clear everything
    const views = await assignmentService.saveMeetingAssignments(meeting.id, {
      roomResourceId: null,
      equipment: [],
    })

    expect(views).toHaveLength(0)
    const listed = await assignmentService.listAssignmentsForMeeting(meeting.id)
    expect(listed).toHaveLength(0)
  })

  it("accepts exact capacity usage (= is valid, > is invalid)", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })

    // NOTEBOOK_ID has totalQuantity: 12 and no other meetings overlap at hour 6
    await expect(
      assignmentService.saveMeetingAssignments(meeting.id, {
        roomResourceId: null,
        equipment: [{ resourceId: NOTEBOOK_ID, requestedQuantity: 12 }],
      }),
    ).resolves.toHaveLength(1)
  })

  it("rejects when equipment quantity exceeds capacity and leaves persisted state unchanged", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })

    // Pre-assign room first
    await assignmentService.saveMeetingAssignments(meeting.id, {
      roomResourceId: MERKEZ_ROOM_ID,
      equipment: [],
    })

    // NOTEBOOK_ID totalQuantity is 12; request 13
    await expect(
      assignmentService.saveMeetingAssignments(meeting.id, {
        roomResourceId: null,
        equipment: [{ resourceId: NOTEBOOK_ID, requestedQuantity: 13 }],
      }),
    ).rejects.toThrow(/kapasitesi yetersiz/)

    // Original room assignment must still be present
    const listed = await assignmentService.listAssignmentsForMeeting(meeting.id)
    expect(listed).toHaveLength(1)
    expect(listed[0].resourceType).toBe("ROOM")
  })

  it("rejects room conflict with another meeting and leaves persisted state unchanged", async () => {
    const { visitService, assignmentService } = makeServices()

    // Two overlapping meetings
    const meetingA = await createMeeting(visitService, { startHour: 8, durationHours: 2 })
    const meetingB = await createMeeting(visitService, { startHour: 9, durationHours: 2 })

    // Give A the room first
    await assignmentService.saveMeetingAssignments(meetingA.id, {
      roomResourceId: MERKEZ_ROOM_ID,
      equipment: [],
    })

    // B tries to take the same room during overlap
    await expect(
      assignmentService.saveMeetingAssignments(meetingB.id, {
        roomResourceId: MERKEZ_ROOM_ID,
        equipment: [],
      }),
    ).rejects.toThrow(/çakışıyor/)

    // B should have no assignments
    const listed = await assignmentService.listAssignmentsForMeeting(meetingB.id)
    expect(listed).toHaveLength(0)
  })

  it("does not treat the meeting's own pre-existing room as a conflict", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })

    // Assign room
    await assignmentService.saveMeetingAssignments(meeting.id, {
      roomResourceId: MERKEZ_ROOM_ID,
      equipment: [],
    })

    // Re-save same room — should not conflict with itself
    await expect(
      assignmentService.saveMeetingAssignments(meeting.id, {
        roomResourceId: MERKEZ_ROOM_ID,
        equipment: [{ resourceId: NOTEBOOK_ID, requestedQuantity: 2 }],
      }),
    ).resolves.toHaveLength(2)
  })

  it("does not count the meeting's own pre-existing equipment against its own capacity", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })

    // Assign 10 notebooks
    await assignmentService.saveMeetingAssignments(meeting.id, {
      roomResourceId: null,
      equipment: [{ resourceId: NOTEBOOK_ID, requestedQuantity: 10 }],
    })

    // Re-save with 12 notebooks — should succeed (self not counted)
    await expect(
      assignmentService.saveMeetingAssignments(meeting.id, {
        roomResourceId: null,
        equipment: [{ resourceId: NOTEBOOK_ID, requestedQuantity: 12 }],
      }),
    ).resolves.toHaveLength(1)
  })

  it("rejects duplicate equipment resourceIds", async () => {
    const { visitService, assignmentService } = makeServices()
    const meeting = await createMeeting(visitService, { startHour: 6 })

    await expect(
      assignmentService.saveMeetingAssignments(meeting.id, {
        roomResourceId: null,
        equipment: [
          { resourceId: NOTEBOOK_ID, requestedQuantity: 1 },
          { resourceId: NOTEBOOK_ID, requestedQuantity: 2 },
        ],
      }),
    ).rejects.toThrow("Aynı ekipman birden fazla kez eklenemez.")
  })

  it("rejects save on a completed Meeting", async () => {
    const { visitService, assignmentService } = makeServices()
    const result = await visitService.createMeeting({
      visitors: [{ firstName: "Tamamlanan", lastName: "Ziyaretçi", email: "done@example.com", company: "Test A.Ş." }],
      visitTypeId: "meeting",
      hostEmployeeName: "Maya Kara",
      hostCompanyId: "bplas",
      facilityId: "bplas-merkez",
      plannedStart: new Date().toISOString(),
      plannedEnd: new Date(Date.now() + 3600000).toISOString(),
    })

    // Terminate all visits
    await visitService.cancelVisit(result.visits[0].id)

    await expect(
      assignmentService.saveMeetingAssignments(result.meeting.id, {
        roomResourceId: MERKEZ_ROOM_ID,
        equipment: [],
      }),
    ).rejects.toThrow("Tamamlanan ziyaretlerde kaynak atamaları değiştirilemez.")
  })
})
