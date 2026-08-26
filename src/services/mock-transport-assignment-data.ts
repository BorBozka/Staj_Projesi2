import { addMinutes, subYears } from "date-fns"

import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import type { DriverResource, VehicleResource } from "@/domain/resources"
import { initialMockResources } from "@/services/mock-resource-data"
import { scenarioAt, scenarioCreatedAt, scenarioMoment } from "@/services/mock-scenario"

type AssignmentSnapshot = Pick<PlannedTransportAssignment,
  | "companyId"
  | "companyName"
  | "facilityId"
  | "facilityName"
  | "vehicleResourceId"
  | "vehicleName"
  | "vehicleLicensePlate"
  | "driverResourceId"
  | "driverName"
>

interface LoadProfile {
  snapshot: AssignmentSnapshot
  count: number
  durations: readonly number[]
  startHour?: number
}

const purposes = [
  "Tedarikçi evrak teslimi",
  "Kalite numunesi transferi",
  "Bakım ekibi saha ulaşımı",
  "Tesisler arası parça transferi",
  "Teknik ekipman sevki",
  "Üretim hattı numune toplama",
  "Merkez depo transferi",
  "Satın alma evrakı teslimi",
  "Servis ekibi ulaşımı",
  "Acil parça transferi",
  "Kalibrasyon ekipmanı teslimi ve teknik servis ekibinin üretim sahasına güvenli ulaşımının sağlanması",
  "Ar-Ge prototip parçalarının kalite laboratuvarına kontrollü transferi",
] as const

const vehicles = initialMockResources.filter((resource): resource is VehicleResource => resource.type === "VEHICLE")
const drivers = initialMockResources.filter((resource): resource is DriverResource => resource.type === "DRIVER")

function assignmentSnapshot(vehicleId: string, driverId: string): AssignmentSnapshot {
  const vehicle = vehicles.find((resource) => resource.id === vehicleId)
  const driver = drivers.find((resource) => resource.id === driverId)
  if (!vehicle || !driver || vehicle.companyId !== driver.companyId || vehicle.facilityId !== driver.facilityId) {
    throw new Error("Geçersiz mock transport resource eşleşmesi: " + vehicleId + " / " + driverId)
  }
  return {
    companyId: vehicle.companyId,
    companyName: vehicle.companyName,
    facilityId: vehicle.facilityId,
    facilityName: vehicle.facilityName,
    vehicleResourceId: vehicle.id,
    vehicleName: [vehicle.brand, vehicle.model].join(" "),
    vehicleLicensePlate: vehicle.licensePlate,
    driverResourceId: driver.id,
    driverName: driver.fullName,
  }
}

const pairs = {
  transitAyse: assignmentSnapshot("resource-vehicle-transit-merkez", "resource-driver-ayse-demir"),
  transitZeynep: assignmentSnapshot("resource-vehicle-transit-merkez", "resource-driver-zeynep-arslan"),
  sprinterZeynep: assignmentSnapshot("resource-vehicle-sprinter-merkez", "resource-driver-zeynep-arslan"),
  sprinterAyse: assignmentSnapshot("resource-vehicle-sprinter-merkez", "resource-driver-ayse-demir"),
  courierBurak: assignmentSnapshot("resource-vehicle-courier-merkez", "resource-driver-burak-cetin"),
  dailySelin: assignmentSnapshot("resource-vehicle-daily-merkez", "resource-driver-selin-yildiz"),
  kangooEmre: assignmentSnapshot("resource-vehicle-kangoo-merkez", "resource-driver-emre-aksoy"),
  dobloHakan: assignmentSnapshot("resource-vehicle-doblo-merkez", "resource-driver-hakan-yalcin"),
  masterElif: assignmentSnapshot("resource-vehicle-master-merkez", "resource-driver-elif-sahin"),
  transporterMehmet: assignmentSnapshot("resource-vehicle-transporter-arge", "resource-driver-mehmet-kaya"),
  transporterCan: assignmentSnapshot("resource-vehicle-transporter-arge", "resource-driver-can-ozdemir"),
  proaceDeniz: assignmentSnapshot("resource-vehicle-proace-otomotiv", "resource-driver-deniz-gok"),
  meganeDeniz: assignmentSnapshot("resource-vehicle-megane-otomotiv", "resource-driver-deniz-gok"),
} as const

const currentProfiles: LoadProfile[] = [
  { snapshot: pairs.transitAyse, count: 10, durations: [30, 45, 60] },
  { snapshot: pairs.sprinterZeynep, count: 8, durations: [180, 240, 240, 180] },
  { snapshot: pairs.courierBurak, count: 8, durations: [30, 45, 45, 60] },
  { snapshot: pairs.dailySelin, count: 7, durations: [60, 60, 90] },
  { snapshot: pairs.kangooEmre, count: 6, durations: [60, 90, 90] },
  { snapshot: pairs.dobloHakan, count: 6, durations: [90, 120, 150] },
  { snapshot: pairs.masterElif, count: 5, durations: [150, 180, 240] },
  { snapshot: pairs.transporterMehmet, count: 4, durations: [120, 150, 180] },
  { snapshot: pairs.proaceDeniz, count: 3, durations: [120, 180, 240] },
]

const previousProfiles: LoadProfile[] = [
  { snapshot: pairs.transitZeynep, count: 7, durations: [60, 90, 120] },
  { snapshot: pairs.sprinterAyse, count: 6, durations: [120, 150, 180] },
  { snapshot: pairs.courierBurak, count: 6, durations: [45, 60, 90] },
  { snapshot: pairs.dailySelin, count: 5, durations: [120, 150, 180] },
  { snapshot: pairs.kangooEmre, count: 5, durations: [60, 90, 120] },
  { snapshot: pairs.dobloHakan, count: 4, durations: [180, 240] },
  { snapshot: pairs.transporterCan, count: 4, durations: [90, 120, 150] },
  { snapshot: pairs.meganeDeniz, count: 3, durations: [180, 240, 240] },
]

const previousYearProfiles: LoadProfile[] = [
  { snapshot: pairs.transitAyse, count: 6, durations: [90, 120, 150] },
  { snapshot: pairs.sprinterZeynep, count: 6, durations: [120, 180, 180] },
  { snapshot: pairs.courierBurak, count: 5, durations: [30, 45, 60] },
  { snapshot: pairs.dailySelin, count: 5, durations: [90, 120, 150] },
  { snapshot: pairs.kangooEmre, count: 5, durations: [120, 150, 180] },
  { snapshot: pairs.dobloHakan, count: 4, durations: [60, 90, 120] },
  { snapshot: pairs.transporterCan, count: 4, durations: [180, 240] },
  { snapshot: pairs.meganeDeniz, count: 3, durations: [120, 180, 240] },
]

function relationFor(snapshot: AssignmentSnapshot, sequence: number): Pick<PlannedTransportAssignment, "relatedMeetingId" | "relatedVisitId"> {
  if (sequence % 3 !== 0) return {}
  if (snapshot.facilityId === "bplas-merkez") {
    return sequence % 2 === 0 ? { relatedMeetingId: "meeting-v-102" } : { relatedVisitId: "v-103" }
  }
  if (snapshot.facilityId === "bplas-arge") {
    return sequence % 2 === 0 ? { relatedMeetingId: "meeting-v-today-completed" } : { relatedVisitId: "v-today-completed" }
  }
  return sequence % 2 === 0 ? { relatedMeetingId: "meeting-v-105" } : { relatedVisitId: "v-105" }
}

function yearShift(value: string, years: number) {
  return years === 0 ? value : subYears(new Date(value), years).toISOString()
}

function buildPeriodAssignments({ prefix, startDayOffset, profiles, cancellationOffset, previousYears = 0 }: {
  prefix: string
  startDayOffset: number
  profiles: LoadProfile[]
  cancellationOffset: number
  previousYears?: number
}) {
  let sequence = 0
  return profiles.flatMap((profile, profileIndex) => Array.from({ length: profile.count }, (_, profileAssignmentIndex) => {
    const currentSequence = sequence++
    const dayOffset = startDayOffset + (profile.count === 1 ? 0 : Math.floor(profileAssignmentIndex * 29 / (profile.count - 1)))
    const hour = profile.startHour ?? 7 + (profileIndex % 4) * 2
    const minute = profileAssignmentIndex % 2 === 0 ? 30 : 0
    const duration = profile.durations[profileAssignmentIndex % profile.durations.length]
    const isLiveCurrentAssignment = prefix === "current" && profileIndex === 0 && profileAssignmentIndex === profile.count - 1
    const plannedStart = isLiveCurrentAssignment ? scenarioMoment(-45) : yearShift(scenarioAt(dayOffset, hour, minute), previousYears)
    const plannedEnd = isLiveCurrentAssignment ? scenarioMoment(45) : addMinutes(new Date(plannedStart), duration).toISOString()

    return {
      id: "transport-" + prefix + "-" + String(profileIndex + 1).padStart(2, "0") + "-" + String(profileAssignmentIndex + 1).padStart(2, "0"),
      ...profile.snapshot,
      plannedStart,
      plannedEnd,
      purpose: purposes[(currentSequence + profileIndex * 2) % purposes.length],
      ...relationFor(profile.snapshot, currentSequence),
      status: (currentSequence + cancellationOffset) % 6 === 0 ? "CANCELLED" as const : "ACTIVE" as const,
      createdAt: yearShift(scenarioCreatedAt(Math.min(-2, dayOffset - 2)), previousYears),
    }
  }))
}

const currentAssignments = buildPeriodAssignments({ prefix: "current", startDayOffset: -29, profiles: currentProfiles, cancellationOffset: 1 })
const previousAssignments = buildPeriodAssignments({ prefix: "previous", startDayOffset: -59, profiles: previousProfiles, cancellationOffset: 2 })
const previousYearAssignments = buildPeriodAssignments({ prefix: "previous-year", startDayOffset: -29, profiles: previousYearProfiles, cancellationOffset: 3, previousYears: 1 })

// The dense period profiles deliberately cover the last 30 days, but their evenly spread
// dates leave the one-day "Bugün" comparison empty. Keep a small deterministic bridge for
// that compact view so both vehicle and driver comparison bars can be reviewed directly.
const todayComparisonProfiles: LoadProfile[] = [
  { snapshot: pairs.transitZeynep, count: 1, durations: [90], startHour: 17 },
  { snapshot: pairs.sprinterAyse, count: 1, durations: [180], startHour: 17 },
  { snapshot: pairs.courierBurak, count: 1, durations: [45], startHour: 17 },
  { snapshot: pairs.dailySelin, count: 1, durations: [120], startHour: 17 },
  { snapshot: pairs.kangooEmre, count: 1, durations: [60], startHour: 17 },
  { snapshot: pairs.dobloHakan, count: 1, durations: [150], startHour: 17 },
  { snapshot: pairs.transporterCan, count: 1, durations: [240], startHour: 17 },
]

const previousDayAssignments = buildPeriodAssignments({ prefix: "previous-day", startDayOffset: -1, profiles: todayComparisonProfiles, cancellationOffset: 99 })
const previousYearTodayAssignments = buildPeriodAssignments({ prefix: "previous-year-today", startDayOffset: 0, profiles: todayComparisonProfiles, cancellationOffset: 100, previousYears: 1 })

const upcomingAssignments: PlannedTransportAssignment[] = [
  {
    id: "transport-upcoming-supplier-documents",
    ...pairs.courierBurak,
    plannedStart: scenarioAt(1, 9),
    plannedEnd: scenarioAt(1, 10, 30),
    purpose: "Tedarikçi sözleşme evraklarının satın alma birimine teslimi",
    relatedVisitId: "v-103",
    status: "ACTIVE",
    createdAt: scenarioCreatedAt(-1),
  },
  {
    id: "transport-upcoming-training-equipment",
    ...pairs.dobloHakan,
    plannedStart: scenarioAt(5, 10),
    plannedEnd: scenarioAt(5, 13),
    purpose: "Eğitim malzemesi ve uygulama ekipmanı taşıması",
    relatedMeetingId: "meeting-v-workshop-lead",
    status: "ACTIVE",
    createdAt: scenarioCreatedAt(-2),
  },
  {
    id: "transport-upcoming-production-transfer",
    ...pairs.dailySelin,
    plannedStart: scenarioAt(7, 8, 30),
    plannedEnd: scenarioAt(7, 10),
    purpose: "Üretim hattı numune toplama",
    status: "ACTIVE",
    createdAt: scenarioCreatedAt(-2),
  },
  {
    id: "transport-upcoming-service-equipment",
    ...pairs.kangooEmre,
    plannedStart: scenarioAt(9, 13),
    plannedEnd: scenarioAt(9, 14, 30),
    purpose: "Servis ekibi için teknik ekipman sevki",
    status: "ACTIVE",
    createdAt: scenarioCreatedAt(-3),
  },
]

export const initialMockTransportAssignments: PlannedTransportAssignment[] = [
  ...currentAssignments,
  ...previousAssignments,
  ...previousYearAssignments,
  ...previousDayAssignments,
  ...previousYearTodayAssignments,
  ...upcomingAssignments,
]
