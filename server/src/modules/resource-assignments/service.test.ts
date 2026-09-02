import { describe, expect, it } from "vitest"

import type { FacilityResource } from "../resources/types.js"
import { ResourceAssignmentService } from "./service.js"
import {
  InMemoryResourceAssignmentRepository,
  type FixtureMeeting,
} from "./testing/in-memory-resource-assignment-repository.js"

const TS = "2026-01-01T00:00:00.000Z"

function room(id: string, facilityId: string, isActive = true): FacilityResource {
  return { id, type: "ROOM", companyId: "c1", companyName: "C1", facilityId, facilityName: facilityId, isActive, createdAt: TS, updatedAt: TS, name: `Oda ${id}` }
}
function equipment(id: string, facilityId: string, totalQuantity: number, isActive = true): FacilityResource {
  return { id, type: "POOLED_EQUIPMENT", companyId: "c1", companyName: "C1", facilityId, facilityName: facilityId, isActive, createdAt: TS, updatedAt: TS, name: `Ekipman ${id}`, totalQuantity }
}
function meeting(id: string, start: string, end: string, overrides: Partial<FixtureMeeting> = {}): FixtureMeeting {
  return { id, facilityId: "f1", plannedStart: start, plannedEnd: end, visitStatuses: ["PLANNED"], ...overrides }
}

const RESOURCES: FacilityResource[] = [
  room("room-a", "f1"),
  room("room-b", "f1"),
  room("room-f2", "f2"),
  room("room-off", "f1", false),
  equipment("equip-12", "f1", 12),
  equipment("equip-f2", "f2", 4),
  equipment("equip-off", "f1", 5, false),
]

function makeService(meetings: FixtureMeeting[]) {
  const repository = new InMemoryResourceAssignmentRepository({ meetings, resources: RESOURCES })
  return { repository, service: new ResourceAssignmentService(repository) }
}

const M1 = "2026-05-04T09:00:00.000Z"
const M1_END = "2026-05-04T10:00:00.000Z"

describe("ResourceAssignmentService — room availability & overlap", () => {
  it("assigns a room when no other meeting holds it in an overlapping window", async () => {
    const { service } = makeService([meeting("m1", M1, M1_END)])
    const view = await service.assignRoom("m1", { resourceId: "room-a" })
    expect(view).toMatchObject({ resourceType: "ROOM", resourceId: "room-a", meetingId: "m1", resourceName: "Oda room-a" })
  })

  it("rejects a room already held by an overlapping meeting and preserves prior state", async () => {
    const { service } = makeService([
      meeting("m1", M1, M1_END),
      meeting("m2", "2026-05-04T09:30:00.000Z", "2026-05-04T10:30:00.000Z"),
    ])
    await service.assignRoom("m1", { resourceId: "room-a" })
    await expect(service.assignRoom("m2", { resourceId: "room-a" })).rejects.toMatchObject({ code: "ROOM_CONFLICT" })
    expect(await service.listAssignmentsForMeeting("m2")).toHaveLength(0)
  })

  it("allows the same room for meetings whose ranges only touch (half-open)", async () => {
    const { service } = makeService([
      meeting("m1", M1, M1_END),
      meeting("m3", M1_END, "2026-05-04T11:00:00.000Z"),
    ])
    await service.assignRoom("m1", { resourceId: "room-a" })
    const view = await service.assignRoom("m3", { resourceId: "room-a" })
    expect(view.resourceId).toBe("room-a")
  })

  it("rejects an inactive room and a room from another facility", async () => {
    const { service } = makeService([meeting("m1", M1, M1_END)])
    await expect(service.assignRoom("m1", { resourceId: "room-off" })).rejects.toMatchObject({ code: "RESOURCE_INACTIVE" })
    await expect(service.assignRoom("m1", { resourceId: "room-f2" })).rejects.toMatchObject({ code: "INVALID_SCOPE" })
    await expect(service.assignRoom("m1", { resourceId: "nope" })).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" })
  })
})

describe("ResourceAssignmentService — atomic room replacement", () => {
  it("replaces the room when the new one is free", async () => {
    const { service } = makeService([meeting("m1", M1, M1_END)])
    await service.assignRoom("m1", { resourceId: "room-a" })
    await service.assignRoom("m1", { resourceId: "room-b" })
    const listed = await service.listAssignmentsForMeeting("m1")
    expect(listed).toHaveLength(1)
    expect(listed[0].resourceId).toBe("room-b")
  })

  it("keeps the existing room when the replacement conflicts (all-or-nothing)", async () => {
    const { service } = makeService([
      meeting("m1", M1, M1_END),
      meeting("m2", "2026-05-04T09:30:00.000Z", "2026-05-04T10:30:00.000Z"),
    ])
    await service.assignRoom("m1", { resourceId: "room-a" })
    await service.assignRoom("m2", { resourceId: "room-b" })
    await expect(service.assignRoom("m1", { resourceId: "room-b" })).rejects.toMatchObject({ code: "ROOM_CONFLICT" })
    const listed = await service.listAssignmentsForMeeting("m1")
    expect(listed).toHaveLength(1)
    expect(listed[0].resourceId).toBe("room-a")
  })
})

describe("ResourceAssignmentService — equipment capacity", () => {
  it("assigns within capacity and reports used/remaining, self excluded", async () => {
    const { service } = makeService([
      meeting("m1", M1, M1_END),
      meeting("m2", "2026-05-04T09:30:00.000Z", "2026-05-04T10:30:00.000Z"),
    ])
    await service.assignEquipment("m2", { resourceId: "equip-12", requestedQuantity: 5 })

    const eligible = await service.getEligibleEquipment("m1")
    const info = eligible.find((item) => item.resource.id === "equip-12")!
    expect(info).toMatchObject({ usedQuantity: 5, remainingQuantity: 7 })

    const view = await service.assignEquipment("m1", { resourceId: "equip-12", requestedQuantity: 7 })
    expect(view.requestedQuantity).toBe(7)
    // re-save at full pool including own usage must ignore own consumption
    const updated = await service.updateEquipmentAssignment((await service.listAssignmentsForMeeting("m1"))[0].id, 7)
    expect(updated.requestedQuantity).toBe(7)
  })

  it("rejects a request that exceeds remaining capacity and a non-positive quantity", async () => {
    const { service } = makeService([
      meeting("m1", M1, M1_END),
      meeting("m2", "2026-05-04T09:30:00.000Z", "2026-05-04T10:30:00.000Z"),
    ])
    await service.assignEquipment("m2", { resourceId: "equip-12", requestedQuantity: 5 })
    await expect(service.assignEquipment("m1", { resourceId: "equip-12", requestedQuantity: 8 })).rejects.toMatchObject({ code: "EQUIPMENT_CAPACITY" })
    await expect(service.assignEquipment("m1", { resourceId: "equip-12", requestedQuantity: 0 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    await expect(service.assignEquipment("m1", { resourceId: "equip-12", requestedQuantity: 2.5 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
  })

  it("rejects assigning the same equipment twice to one meeting", async () => {
    const { service } = makeService([meeting("m1", M1, M1_END)])
    await service.assignEquipment("m1", { resourceId: "equip-12", requestedQuantity: 2 })
    await expect(service.assignEquipment("m1", { resourceId: "equip-12", requestedQuantity: 3 })).rejects.toMatchObject({ code: "EQUIPMENT_ALREADY_ASSIGNED" })
  })
})

describe("ResourceAssignmentService — saveMeetingAssignments (all-or-nothing)", () => {
  it("persists room + equipment in one call", async () => {
    const { service } = makeService([meeting("m1", M1, M1_END)])
    const views = await service.saveMeetingAssignments("m1", {
      roomResourceId: "room-a",
      equipment: [{ resourceId: "equip-12", requestedQuantity: 3 }],
    })
    expect(views).toHaveLength(2)
    expect(views.map((view) => view.resourceType).sort()).toEqual(["POOLED_EQUIPMENT", "ROOM"])
  })

  it("rejects duplicate desired equipment and non-positive quantity", async () => {
    const { service } = makeService([meeting("m1", M1, M1_END)])
    await expect(service.saveMeetingAssignments("m1", {
      roomResourceId: null,
      equipment: [{ resourceId: "equip-12", requestedQuantity: 1 }, { resourceId: "equip-12", requestedQuantity: 2 }],
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    await expect(service.saveMeetingAssignments("m1", {
      roomResourceId: null,
      equipment: [{ resourceId: "equip-12", requestedQuantity: -1 }],
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
  })

  it("leaves the persisted set unchanged when one item fails validation", async () => {
    const { service } = makeService([
      meeting("m1", M1, M1_END),
      meeting("m2", "2026-05-04T09:30:00.000Z", "2026-05-04T10:30:00.000Z"),
    ])
    await service.saveMeetingAssignments("m1", { roomResourceId: "room-a", equipment: [] })
    await service.saveMeetingAssignments("m2", { roomResourceId: null, equipment: [{ resourceId: "equip-12", requestedQuantity: 10 }] })

    await expect(service.saveMeetingAssignments("m1", {
      roomResourceId: "room-a",
      equipment: [{ resourceId: "equip-12", requestedQuantity: 5 }], // 10 + 5 > 12
    })).rejects.toMatchObject({ code: "EQUIPMENT_CAPACITY" })

    const listed = await service.listAssignmentsForMeeting("m1")
    expect(listed).toHaveLength(1)
    expect(listed[0].resourceType).toBe("ROOM")
  })

  it("does not treat the meeting's own pre-existing room/equipment as a conflict on re-save", async () => {
    const { service } = makeService([meeting("m1", M1, M1_END)])
    await service.saveMeetingAssignments("m1", { roomResourceId: "room-a", equipment: [{ resourceId: "equip-12", requestedQuantity: 10 }] })
    const views = await service.saveMeetingAssignments("m1", { roomResourceId: "room-a", equipment: [{ resourceId: "equip-12", requestedQuantity: 12 }] })
    expect(views).toHaveLength(2)
  })
})

describe("ResourceAssignmentService — read-only protection", () => {
  it("rejects mutations for a completed Meeting (all visits terminal)", async () => {
    const { service } = makeService([meeting("m1", M1, M1_END, { visitStatuses: ["CHECKED_OUT"] })])
    await expect(service.assignRoom("m1", { resourceId: "room-a" })).rejects.toMatchObject({ code: "MEETING_RESOURCES_READ_ONLY" })
    await expect(service.saveMeetingAssignments("m1", { roomResourceId: "room-a", equipment: [] })).rejects.toMatchObject({ code: "MEETING_RESOURCES_READ_ONLY" })
  })

  it("rejects mutations for an explicitly closed Meeting while still allowing eligibility reads", async () => {
    const { service } = makeService([meeting("m1", M1, M1_END, { actualMeetingEnd: "2026-05-04T09:45:00.000Z" })])
    await expect(service.assignEquipment("m1", { resourceId: "equip-12", requestedQuantity: 1 })).rejects.toMatchObject({ code: "MEETING_RESOURCES_READ_ONLY" })
    expect(await service.getEligibleRooms("m1")).toHaveLength(2)
  })

  it("a closed Meeting does not consume room capacity for an overlapping open Meeting", async () => {
    const repository = new InMemoryResourceAssignmentRepository({
      meetings: [
        meeting("m-closed", M1, M1_END, { actualMeetingEnd: "2026-05-04T09:30:00.000Z" }),
        meeting("m2", "2026-05-04T09:15:00.000Z", "2026-05-04T10:15:00.000Z"),
      ],
      resources: RESOURCES,
      assignments: [{
        id: "seed-room", meetingId: "m-closed", resourceId: "room-a", resourceType: "ROOM",
        resourceName: "Oda room-a", companyId: "c1", facilityId: "f1", createdAt: TS,
      }],
    })
    const service = new ResourceAssignmentService(repository)
    const view = await service.assignRoom("m2", { resourceId: "room-a" })
    expect(view.resourceId).toBe("room-a")
  })
})

describe("ResourceAssignmentService — extension validation", () => {
  it("passes when the extended range stays conflict free", async () => {
    const { service } = makeService([meeting("m1", M1, M1_END)])
    await service.assignRoom("m1", { resourceId: "room-a" })
    await expect(service.validateExtension("m1", "2026-05-04T10:30:00.000Z")).resolves.toBeUndefined()
  })

  it("rejects when a room the meeting holds would collide in the extended range", async () => {
    const { service } = makeService([
      meeting("m1", M1, M1_END),
      meeting("m3", "2026-05-04T10:15:00.000Z", "2026-05-04T11:00:00.000Z"),
    ])
    await service.assignRoom("m1", { resourceId: "room-a" })
    await service.assignRoom("m3", { resourceId: "room-a" }) // no conflict yet (m1 ends 10:00)
    await expect(service.validateExtension("m1", "2026-05-04T10:30:00.000Z")).rejects.toMatchObject({ code: "ROOM_CONFLICT" })
  })

  it("rejects when equipment capacity would be exceeded after the extension", async () => {
    const { service } = makeService([
      meeting("m1", M1, M1_END),
      meeting("m3", "2026-05-04T10:15:00.000Z", "2026-05-04T11:00:00.000Z"),
    ])
    await service.assignEquipment("m1", { resourceId: "equip-12", requestedQuantity: 8 })
    await service.assignEquipment("m3", { resourceId: "equip-12", requestedQuantity: 6 }) // no overlap with m1 yet
    await expect(service.validateExtension("m1", "2026-05-04T10:30:00.000Z")).rejects.toMatchObject({ code: "EQUIPMENT_CAPACITY" })
  })
})
