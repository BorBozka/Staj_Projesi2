import { format } from "date-fns"

import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import type { TransportAssignmentFormValues } from "@/features/transport/transport-assignment-form-schema"
import { getTransportAssignmentFormTimes } from "@/features/transport/transport-assignment-time"

export function getTransportAssignmentEditValues(assignment: PlannedTransportAssignment): TransportAssignmentFormValues {
  return {
    companyId: assignment.companyId,
    facilityId: assignment.facilityId,
    date: format(new Date(assignment.plannedStart), "yyyy-MM-dd"),
    ...getTransportAssignmentFormTimes(assignment),
    purpose: assignment.purpose,
    vehicleResourceId: assignment.vehicleResourceId,
    driverResourceId: assignment.driverResourceId,
    relatedKind: assignment.relatedMeetingId ? "meeting" : assignment.relatedVisitId ? "visit" : "none",
    relatedId: assignment.relatedMeetingId ?? assignment.relatedVisitId ?? "",
  }
}
