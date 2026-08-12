import type { EquipmentAssignment, ResourceAssignment, RoomAssignment } from "@/domain/resources"

const timestamp = "2026-08-01T09:00:00.000Z"

/**
 * Deterministic seed assignments used by MockResourceAssignmentService.
 *
 * Assignments are normalized — they store only meetingId / resourceId / type.
 * Resource names, company/facility, totalQuantity are resolved from the catalog.
 *
 * Chosen meetings and resources are from existing mock data:
 *   meeting-v-102  → bplas-merkez  → resource-room-merkez-atlas (ROOM)
 *   meeting-v-103  → bplas-merkez  → resource-notebook-merkez qty 2 (POOLED_EQUIPMENT)
 *   meeting-v-120  → bplas-merkez  → resource-room-merkez-atlas (ROOM)  ← intentionally overlapping to verify conflict
 *
 * Note: v-102 and v-120 overlap on today's schedule. The seed intentionally does NOT
 * assign the same room to both — the test suite exercises that conflict scenario.
 */
export const initialMockAssignments: ResourceAssignment[] = [
  {
    id: "assign-room-v102",
    meetingId: "meeting-v-102",
    resourceId: "resource-room-merkez-atlas",
    resourceType: "ROOM",
    createdAt: timestamp,
  } satisfies RoomAssignment,
  {
    id: "assign-equip-v103",
    meetingId: "meeting-v-103",
    resourceId: "resource-notebook-merkez",
    resourceType: "POOLED_EQUIPMENT",
    requestedQuantity: 2,
    createdAt: timestamp,
  } satisfies EquipmentAssignment,
]
