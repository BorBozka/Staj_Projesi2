import { addHours } from "date-fns"

import type { PlannedTransportAssignment } from "@/domain/transport-assignments"

const start = new Date()
start.setMinutes(0, 0, 0)
const upcomingStart = addHours(start, 3).toISOString()
const upcomingEnd = addHours(start, 4).toISOString()
const afternoonStart = addHours(start, 5).toISOString()
const afternoonEnd = addHours(start, 6).toISOString()
const eveningStart = addHours(start, 7).toISOString()
const eveningEnd = addHours(start, 8).toISOString()
const nextMorningStart = addHours(start, 9).toISOString()
const nextMorningEnd = addHours(start, 10).toISOString()
const nextNoonStart = addHours(start, 11).toISOString()
const nextNoonEnd = addHours(start, 12).toISOString()
const nextAfternoonStart = addHours(start, 13).toISOString()
const nextAfternoonEnd = addHours(start, 14).toISOString()
const nextEveningStart = addHours(start, 15).toISOString()
const nextEveningEnd = addHours(start, 16).toISOString()
const followingMorningStart = addHours(start, 17).toISOString()
const followingMorningEnd = addHours(start, 18).toISOString()
const followingNoonStart = addHours(start, 19).toISOString()
const followingNoonEnd = addHours(start, 20).toISOString()
const followingAfternoonStart = addHours(start, 21).toISOString()
const followingAfternoonEnd = addHours(start, 22).toISOString()
const followingEveningStart = addHours(start, 23).toISOString()
const followingEveningEnd = addHours(start, 24).toISOString()

const baseMockTransportAssignments: PlannedTransportAssignment[] = [
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
  {
    id: "transport-assignment-merkez-afternoon",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: afternoonStart,
    plannedEnd: afternoonEnd,
    purpose: "Üretim hattı parça teslimatı",
    vehicleResourceId: "resource-vehicle-transit-merkez",
    vehicleName: "Ford Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "resource-driver-ayse-demir",
    driverName: "Ayşe Demir",
    status: "ACTIVE",
    createdAt: start.toISOString(),
  },
  {
    id: "transport-assignment-merkez-evening",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: eveningStart,
    plannedEnd: eveningEnd,
    purpose: "Gün sonu saha ekipmanı transferi",
    vehicleResourceId: "resource-vehicle-transit-merkez",
    vehicleName: "Ford Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "resource-driver-ayse-demir",
    driverName: "Ayşe Demir",
    status: "ACTIVE",
    createdAt: start.toISOString(),
  },
  {
    id: "transport-assignment-merkez-next-morning",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: nextMorningStart,
    plannedEnd: nextMorningEnd,
    purpose: "Tedarikçi sevkiyat planı",
    vehicleResourceId: "resource-vehicle-transit-merkez",
    vehicleName: "Ford Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "resource-driver-ayse-demir",
    driverName: "Ayşe Demir",
    status: "ACTIVE",
    createdAt: start.toISOString(),
  },
  {
    id: "transport-assignment-merkez-next-noon",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: nextNoonStart,
    plannedEnd: nextNoonEnd,
    purpose: "İç lojistik malzeme transferi",
    vehicleResourceId: "resource-vehicle-transit-merkez",
    vehicleName: "Ford Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "resource-driver-ayse-demir",
    driverName: "Ayşe Demir",
    status: "ACTIVE",
    createdAt: start.toISOString(),
  },
  {
    id: "transport-assignment-merkez-next-afternoon",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: nextAfternoonStart,
    plannedEnd: nextAfternoonEnd,
    purpose: "Geri dönüş sevkiyat planı",
    vehicleResourceId: "resource-vehicle-transit-merkez",
    vehicleName: "Ford Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "resource-driver-ayse-demir",
    driverName: "Ayşe Demir",
    status: "ACTIVE",
    createdAt: start.toISOString(),
  },
  {
    id: "transport-assignment-merkez-next-evening",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: nextEveningStart,
    plannedEnd: nextEveningEnd,
    purpose: "Akşam vardiyası evrak teslimatı",
    vehicleResourceId: "resource-vehicle-transit-merkez",
    vehicleName: "Ford Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "resource-driver-ayse-demir",
    driverName: "Ayşe Demir",
    status: "ACTIVE",
    createdAt: start.toISOString(),
  },
  {
    id: "transport-assignment-merkez-following-morning",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: followingMorningStart,
    plannedEnd: followingMorningEnd,
    purpose: "Bakım ekibi saha ulaşımı",
    vehicleResourceId: "resource-vehicle-transit-merkez",
    vehicleName: "Ford Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "resource-driver-ayse-demir",
    driverName: "Ayşe Demir",
    status: "ACTIVE",
    createdAt: start.toISOString(),
  },
  {
    id: "transport-assignment-merkez-following-noon",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: followingNoonStart,
    plannedEnd: followingNoonEnd,
    purpose: "Numune ve kalite evrakı transferi",
    vehicleResourceId: "resource-vehicle-transit-merkez",
    vehicleName: "Ford Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "resource-driver-ayse-demir",
    driverName: "Ayşe Demir",
    status: "ACTIVE",
    createdAt: start.toISOString(),
  },
  {
    id: "transport-assignment-merkez-following-afternoon",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: followingAfternoonStart,
    plannedEnd: followingAfternoonEnd,
    purpose: "Depolar arası yedek parça sevki",
    vehicleResourceId: "resource-vehicle-transit-merkez",
    vehicleName: "Ford Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "resource-driver-ayse-demir",
    driverName: "Ayşe Demir",
    status: "ACTIVE",
    createdAt: start.toISOString(),
  },
  {
    id: "transport-assignment-merkez-following-evening",
    companyId: "bplas",
    companyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: followingEveningStart,
    plannedEnd: followingEveningEnd,
    purpose: "Gün sonu operasyon malzemesi dönüşü",
    vehicleResourceId: "resource-vehicle-transit-merkez",
    vehicleName: "Ford Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "resource-driver-ayse-demir",
    driverName: "Ayşe Demir",
    status: "ACTIVE",
    createdAt: start.toISOString(),
  },
]

const transportResourceVariants = [
  { vehicleResourceId: "resource-vehicle-transit-merkez", vehicleName: "Ford Transit", vehicleLicensePlate: "16 BPL 101", driverResourceId: "resource-driver-ayse-demir", driverName: "Ayşe Demir" },
  { vehicleResourceId: "resource-vehicle-sprinter-merkez", vehicleName: "Mercedes Sprinter", vehicleLicensePlate: "16 BPL 303", driverResourceId: "resource-driver-zeynep-arslan", driverName: "Zeynep Arslan" },
  { vehicleResourceId: "resource-vehicle-courier-merkez", vehicleName: "Ford Courier", vehicleLicensePlate: "16 BPL 404", driverResourceId: "resource-driver-burak-cetin", driverName: "Burak Çetin" },
]

export const initialMockTransportAssignments = baseMockTransportAssignments.map((assignment, index) => ({
  ...assignment,
  ...transportResourceVariants[index % transportResourceVariants.length],
}))
