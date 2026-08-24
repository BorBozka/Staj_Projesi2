import type { EquipmentAssignment, ResourceAssignment, RoomAssignment } from "@/domain/resources"
import { scenarioCreatedAt } from "@/services/mock-scenario"

const timestamp = scenarioCreatedAt(-5)

/**
 * Deterministic seed assignments used by MockResourceAssignmentService.
 *
 * Assignments retain immutable resource identity and capacity snapshots so they
 * remain readable if the corresponding catalog record is later deleted.
 *
 * Chosen meetings and resources are from existing mock data:
 *   meeting-v-102 → bplas-merkez → resource-room-merkez-atlas (ROOM)
 *   meeting-v-103 → bplas-merkez → resource-notebook-merkez qty 2 (POOLED_EQUIPMENT)
 */
export const initialMockAssignments: ResourceAssignment[] = [
  {
    id: "assign-room-v102",
    meetingId: "meeting-v-102",
    resourceId: "resource-room-merkez-atlas",
    resourceType: "ROOM",
    resourceName: "Atlas Toplantı Odası",
    companyId: "bplas",
    facilityId: "bplas-merkez",
    createdAt: timestamp,
  } satisfies RoomAssignment,
  {
    id: "assign-equip-v103",
    meetingId: "meeting-v-103",
    resourceId: "resource-notebook-merkez",
    resourceType: "POOLED_EQUIPMENT",
    resourceName: "Notebook Havuzu",
    companyId: "bplas",
    facilityId: "bplas-merkez",
    totalQuantity: 12,
    requestedQuantity: 2,
    createdAt: timestamp,
  } satisfies EquipmentAssignment,
]
