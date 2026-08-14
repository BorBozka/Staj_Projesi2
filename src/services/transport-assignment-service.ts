import type {
  CreatePlannedTransportAssignmentInput,
  PlannedTransportAssignment,
  TransportAvailability,
  TransportAvailabilityInput,
} from "@/domain/transport-assignments"

export interface TransportAssignmentService {
  listAssignments(): Promise<PlannedTransportAssignment[]>
  getAvailability(input: TransportAvailabilityInput): Promise<TransportAvailability>
  createAssignment(input: CreatePlannedTransportAssignmentInput): Promise<PlannedTransportAssignment>
  updateAssignment(id: string, input: CreatePlannedTransportAssignmentInput): Promise<PlannedTransportAssignment>
  cancelAssignment(id: string): Promise<PlannedTransportAssignment>
}
