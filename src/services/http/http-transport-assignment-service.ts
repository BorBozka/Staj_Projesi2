import { apiClient } from "@/lib/http"
import type {
  CreatePlannedTransportAssignmentInput,
  PlannedTransportAssignment,
  TransportAvailability,
  TransportAvailabilityInput,
} from "@/domain/transport-assignments"
import type { TransportAssignmentService } from "@/services/transport-assignment-service"

/**
 * Planned vehicle/driver assignments over `/api/transport-assignments`. The server is the
 * authority on overlap/capacity; a `409` conflict surfaces to the form as an `ApiClientError`.
 */
export class HttpTransportAssignmentService implements TransportAssignmentService {
  listAssignments(): Promise<PlannedTransportAssignment[]> {
    return apiClient.get<PlannedTransportAssignment[]>("/transport-assignments")
  }

  getAvailability(input: TransportAvailabilityInput): Promise<TransportAvailability> {
    return apiClient.post<TransportAvailability>("/transport-assignments/availability", input)
  }

  createAssignment(input: CreatePlannedTransportAssignmentInput): Promise<PlannedTransportAssignment> {
    return apiClient.post<PlannedTransportAssignment>("/transport-assignments", input)
  }

  updateAssignment(id: string, input: CreatePlannedTransportAssignmentInput): Promise<PlannedTransportAssignment> {
    return apiClient.patch<PlannedTransportAssignment>(`/transport-assignments/${encodeURIComponent(id)}`, input)
  }

  cancelAssignment(id: string): Promise<PlannedTransportAssignment> {
    return apiClient.post<PlannedTransportAssignment>(`/transport-assignments/${encodeURIComponent(id)}/cancel`)
  }
}
