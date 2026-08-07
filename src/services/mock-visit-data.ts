import { addDays, addHours, setHours, setMinutes, startOfDay, subDays } from "date-fns"

import type { Visit, VisitReferenceData, VisitStatus } from "@/domain/visits"

export const mockVisitReferenceData: VisitReferenceData = {
  companies: [
    { id: "bplas", name: "BPLAS A.Ş." },
    { id: "bplas-otomotiv", name: "BPLAS Otomotiv A.Ş." },
    { id: "anadolu-lojistik", name: "Anadolu Lojistik A.Ş." },
  ],
  facilities: [
    { id: "bplas-merkez", companyId: "bplas", name: "Merkez Tesis" },
    { id: "bplas-arge", companyId: "bplas", name: "Ar-Ge Merkezi" },
    { id: "otomotiv-uretim", companyId: "bplas-otomotiv", name: "Üretim Tesisi" },
    { id: "anadolu-lojistik-merkez", companyId: "anadolu-lojistik", name: "Lojistik Merkezi" },
  ],
  employees: [
    { id: "maya-kara", companyId: "bplas", facilityIds: ["bplas-merkez"], name: "Maya Kara", department: "Satın Alma" },
    { id: "emre-yilmaz", companyId: "bplas", facilityIds: ["bplas-merkez", "bplas-arge"], name: "Emre Yılmaz", department: "Mühendislik" },
    { id: "selin-aydin", companyId: "bplas-otomotiv", facilityIds: ["otomotiv-uretim"], name: "Selin Aydın", department: "Üretim" },
    { id: "kerem-demir", companyId: "anadolu-lojistik", facilityIds: ["anadolu-lojistik-merkez"], name: "Kerem Demir", department: "Operasyon" },
  ],
  visitTypes: [
    { id: "meeting", name: "Toplantı" },
    { id: "technical-service", name: "Teknik Servis / Bakım" },
    { id: "supplier", name: "Tedarikçi" },
    { id: "interview", name: "İş Görüşmesi" },
    { id: "audit", name: "Denetim" },
    { id: "customer", name: "Müşteri Ziyareti" },
  ],
  currentEmployee: {
    employeeId: "maya-kara",
    companyId: "bplas",
    facilityId: "bplas-merkez",
  },
}

function at(day: Date, hour: number, minute = 0) {
  return setMinutes(setHours(startOfDay(day), hour), minute).toISOString()
}

interface SeedVisit {
  id: string
  firstName: string
  lastName: string
  email: string
  day: Date
  startHour: number
  startMinute?: number
  durationHours: number
  typeId: string
  employeeId: string
  companyId: string
  facilityId: string
  status: VisitStatus
  note?: string
}

function toVisit(seed: SeedVisit): Visit {
  const type = mockVisitReferenceData.visitTypes.find((item) => item.id === seed.typeId)!
  const employee = mockVisitReferenceData.employees.find((item) => item.id === seed.employeeId)!
  const company = mockVisitReferenceData.companies.find((item) => item.id === seed.companyId)!
  const facility = mockVisitReferenceData.facilities.find((item) => item.id === seed.facilityId)!
  const plannedStart = at(seed.day, seed.startHour, seed.startMinute)
  const plannedEnd = addHours(new Date(plannedStart), seed.durationHours).toISOString()
  const timestamp = subDays(new Date(), 3).toISOString()

  return {
    id: seed.id,
    visitor: {
      id: `visitor-${seed.id}`,
      firstName: seed.firstName,
      lastName: seed.lastName,
      email: seed.email,
    },
    visitTypeId: type.id,
    visitTypeName: type.name,
    hostEmployeeId: employee.id,
    hostEmployeeName: employee.name,
    hostCompanyId: company.id,
    hostCompanyName: company.name,
    facilityId: facility.id,
    facilityName: facility.name,
    plannedStart,
    plannedEnd,
    status: seed.status,
    note: seed.note,
    createdAt: timestamp,
    updatedAt: timestamp,
    cancelledAt: seed.status === "CANCELLED" ? subDays(new Date(), 1).toISOString() : undefined,
  }
}

const today = new Date()
const densityTestDay = addDays(today, 8)

export const initialMockVisits: Visit[] = [
  toVisit({ id: "v-101", firstName: "Deniz", lastName: "Aksoy", email: "deniz.aksoy@example.com", day: today, startHour: 9, durationHours: 1.5, typeId: "supplier", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_OUT" }),
  toVisit({ id: "v-102", firstName: "Cem", lastName: "Ergin", email: "cem.ergin@example.com", day: today, startHour: 11, durationHours: 1, typeId: "meeting", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_IN", note: "Ürün tasarım değerlendirmesi" }),
  toVisit({ id: "v-103", firstName: "Lara", lastName: "Şen", email: "lara.sen@example.com", day: today, startHour: 14, startMinute: 30, durationHours: 1.5, typeId: "customer", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-104", firstName: "Ozan", lastName: "Acar", email: "ozan.acar@example.com", day: addDays(today, 1), startHour: 10, durationHours: 2, typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED", note: "Soğutma sistemi kontrolü" }),
  toVisit({ id: "v-105", firstName: "Ece", lastName: "Koç", email: "ece.koc@example.com", day: addDays(today, 2), startHour: 13, durationHours: 1, typeId: "audit", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "PLANNED" }),
  toVisit({ id: "v-106", firstName: "Can", lastName: "Öz", email: "can.oz@example.com", day: subDays(today, 1), startHour: 15, durationHours: 1, typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CANCELLED" }),
  toVisit({ id: "v-107", firstName: "Ada", lastName: "Güneş", email: "ada.gunes@example.com", day: subDays(today, 2), startHour: 10, durationHours: 1, typeId: "interview", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "NO_SHOW" }),
  toVisit({ id: "v-108", firstName: "Bora", lastName: "Tuna", email: "bora.tuna@example.com", day: addDays(today, 5), startHour: 9, startMinute: 30, durationHours: 2, typeId: "supplier", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", status: "PLANNED" }),
  toVisit({ id: "v-109", firstName: "Alara", lastName: "Yalçın", email: "alara.yalcin@example.com", day: densityTestDay, startHour: 9, durationHours: 1.5, typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-110", firstName: "Mert", lastName: "Arı", email: "mert.ari@example.com", day: densityTestDay, startHour: 9, startMinute: 30, durationHours: 1, typeId: "supplier", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED" }),
  toVisit({ id: "v-111", firstName: "Nil", lastName: "Eren", email: "nil.eren@example.com", day: densityTestDay, startHour: 10, durationHours: 0.5, typeId: "interview", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-112", firstName: "Tolga", lastName: "Işık", email: "tolga.isik@example.com", day: densityTestDay, startHour: 11, durationHours: 1, typeId: "customer", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "PLANNED" }),
  toVisit({ id: "v-113", firstName: "Derya", lastName: "Polat", email: "derya.polat@example.com", day: densityTestDay, startHour: 13, durationHours: 2, typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-114", firstName: "Kaan", lastName: "Bulut", email: "kaan.bulut@example.com", day: densityTestDay, startHour: 13, startMinute: 30, durationHours: 0.5, typeId: "audit", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-115", firstName: "Aslı", lastName: "Sönmez", email: "asli.sonmez@example.com", day: addDays(today, 3), startHour: 9, durationHours: 1, typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-116", firstName: "Barış", lastName: "Ateş", email: "baris.ates@example.com", day: addDays(today, 4), startHour: 15, durationHours: 1, typeId: "supplier", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED" }),
  toVisit({ id: "v-117", firstName: "İpek", lastName: "Kurt", email: "ipek.kurt@example.com", day: addDays(today, 6), startHour: 10, durationHours: 1.5, typeId: "customer", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "PLANNED" }),
  toVisit({ id: "v-118", firstName: "Onur", lastName: "Yüce", email: "onur.yuce@example.com", day: addDays(today, 7), startHour: 14, durationHours: 1, typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-119", firstName: "Zeynep", lastName: "Tan", email: "zeynep.tan@example.com", day: addDays(today, 10), startHour: 11, durationHours: 1, typeId: "audit", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", status: "PLANNED" }),
]
