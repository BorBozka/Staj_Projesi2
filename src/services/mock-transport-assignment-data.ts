import { addHours } from "date-fns"

import type { PlannedTransportAssignment } from "@/domain/transport-assignments"

const start = new Date()
start.setMinutes(0, 0, 0)
const end = addHours(start, 2).toISOString()
const upcomingStart = addHours(start, 3).toISOString()
const upcomingEnd = addHours(start, 4).toISOString()

export const initialMockTransportAssignments: PlannedTransportAssignment[] = [
  {
    id: "transport-assignment-merkez-morning",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: start.toISOString(),
    plannedEnd: end,
    purpose: "Tedarikçi saha ziyareti",
    vehicleResourceId: "resource-vehicle-transit-merkez",
    vehicleName: "Ford Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "resource-driver-ayse-demir",
    driverName: "Ayşe Demir",
    status: "ACTIVE",
    createdAt: start.toISOString(),
  },
  {
    id: "transport-assignment-merkez-upcoming",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: upcomingStart,
    plannedEnd: upcomingEnd,
    purpose: "Planlı tesisler arası sevkiyat",
    vehicleResourceId: "resource-vehicle-transit-merkez",
    vehicleName: "Ford Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "resource-driver-ayse-demir",
    driverName: "Ayşe Demir",
    status: "ACTIVE",
    createdAt: start.toISOString(),
  },
]
