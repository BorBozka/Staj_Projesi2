import type { VisitTypeDefinition } from "@/domain/admin"
import type { OrganizationSnapshot } from "@/domain/organization"
import type { InvitationStatus, Meeting, VisitRecord, VisitReferenceData, VisitStatus } from "@/domain/visits"
import { initialMockOrganizationSnapshot } from "@/services/mock-organization-store"
import { initialMockVisitTypes } from "@/services/mock-visit-type-store"
import { scenarioAt, scenarioCreatedAt, scenarioMoment } from "@/services/mock-scenario"

const employeeDefinitions = [
  { id: "eda-karaca", companyId: "bplas", facilityIds: ["bplas-merkez", "bplas-arge", "otomotiv-uretim", "anadolu-lojistik-merkez"], name: "Eda Karaca", departmentId: "department-bplas-yonetim" },
  { id: "maya-kara", companyId: "bplas", facilityIds: ["bplas-merkez"], name: "Maya Kara", departmentId: "department-bplas-satin-alma" },
  { id: "emre-yilmaz", companyId: "bplas", facilityIds: ["bplas-merkez", "bplas-arge"], name: "Emre Yılmaz", departmentId: "department-bplas-muhendislik" },
  { id: "selin-aydin", companyId: "bplas-otomotiv", facilityIds: ["otomotiv-uretim"], name: "Selin Aydın", departmentId: "department-bplas-otomotiv-uretim" },
  { id: "kerem-demir", companyId: "anadolu-lojistik", facilityIds: ["anadolu-lojistik-merkez"], name: "Kerem Demir", departmentId: "department-anadolu-lojistik-operasyon" },
] as const

/** Compatibility projection for Visit UI. Company, facility, department labels and visit
 * types are always resolved from their canonical sources (the organization snapshot and the
 * visit-type store); this function owns no state. */
export function createMockVisitReferenceData(
  organization: OrganizationSnapshot,
  visitTypes: VisitTypeDefinition[],
): VisitReferenceData {
  const companies = organization.companies.filter((company) => company.active).map(({ id, name }) => ({ id, name }))
  const facilities = organization.facilities
    .filter((facility) => facility.active && organization.companies.some((company) => company.id === facility.parentId && company.active))
    .map(({ id, parentId, name }) => ({ id, companyId: parentId, name }))
  const employees = employeeDefinitions.map((employee) => {
    const department = organization.departments.find((item) => item.id === employee.departmentId)
    return { ...employee, facilityIds: [...employee.facilityIds], department: department?.name ?? "—" }
  })
  return {
    companies,
    facilities,
    employees,
    visitTypes,
    currentEmployee: { employeeId: "eda-karaca", companyId: "bplas", facilityId: "bplas-merkez", role: "MANAGER" },
  }
}

// Legacy tests and pure UI utilities can use the initial projection. Runtime services never
// read this constant; they request a fresh projection from MockOrganizationStore.
export const mockVisitReferenceData = createMockVisitReferenceData(initialMockOrganizationSnapshot, initialMockVisitTypes)

interface SeedVisit {
  id: string
  firstName: string
  lastName: string
  company: string
  dayOffset?: number
  startHour?: number
  startMinute?: number
  durationMinutes?: number
  plannedStart?: string
  plannedEnd?: string
  actualCheckIn?: string
  actualCheckOut?: string
  status: VisitStatus
  typeId: string
  employeeId: string
  companyId: string
  facilityId: string
  creatorEmployeeId?: string
  invitationStatus?: InvitationStatus
  phone?: string
  note?: string
  hasAdditionalRequirements?: boolean
  additionalRequirementNote?: string
  visitorCardReturned?: boolean
  actualMeetingEnd?: string
  meetingEndSource?: "MANUAL" | "VISITOR_CHECK_OUT"
}

function endFor(dayOffset: number, hour: number, minute: number, durationMinutes: number) {
  const totalMinutes = hour * 60 + minute + durationMinutes
  return scenarioAt(dayOffset + Math.floor(totalMinutes / 1440), Math.floor((totalMinutes % 1440) / 60), totalMinutes % 60)
}

function toMeetingVisit(seed: SeedVisit): { meeting: Meeting; visit: VisitRecord } {
  const type = mockVisitReferenceData.visitTypes.find((item) => item.id === seed.typeId)!
  const employee = mockVisitReferenceData.employees.find((item) => item.id === seed.employeeId)!
  const company = mockVisitReferenceData.companies.find((item) => item.id === seed.companyId)!
  const facility = mockVisitReferenceData.facilities.find((item) => item.id === seed.facilityId)!
  const dayOffset = seed.dayOffset ?? 0
  const startHour = seed.startHour ?? 9
  const startMinute = seed.startMinute ?? 0
  const plannedStart = seed.plannedStart ?? scenarioAt(dayOffset, startHour, startMinute)
  const plannedEnd = seed.plannedEnd ?? endFor(dayOffset, startHour, startMinute, seed.durationMinutes ?? 60)
  const createdAt = scenarioCreatedAt(Math.min(-2, dayOffset - 2))
  const invitationStatus = seed.invitationStatus ?? "SENT"
  const meetingId = `meeting-${seed.id}`

  return {
    meeting: {
      id: meetingId,
      creatorEmployeeId: seed.creatorEmployeeId ?? employee.id,
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
      note: seed.note,
      hasAdditionalRequirements: seed.hasAdditionalRequirements ?? false,
      additionalRequirementNote: seed.hasAdditionalRequirements ? seed.additionalRequirementNote : undefined,
      actualMeetingEnd: seed.actualMeetingEnd,
      meetingEndSource: seed.meetingEndSource,
      createdAt,
      updatedAt: createdAt,
    },
    visit: {
      id: seed.id,
      meetingId,
      visitor: { id: `visitor-${seed.id}`, firstName: seed.firstName, lastName: seed.lastName, email: `${seed.id}@ornek-firma.test`, company: seed.company, phone: seed.phone },
      actualCheckIn: seed.actualCheckIn,
      actualCheckOut: seed.actualCheckOut,
      visitorCardReturned: seed.visitorCardReturned,
      status: seed.status,
      invitationStatus,
      invitationSentAt: invitationStatus === "SENT" ? createdAt : undefined,
      invitationError: invitationStatus === "FAILED" ? "Davet iletimi geçici olarak başarısız oldu." : undefined,
      createdAt,
      updatedAt: createdAt,
      cancelledAt: seed.status === "CANCELLED" ? scenarioCreatedAt(-1) : undefined,
    },
  }
}

const operationalSeeds: SeedVisit[] = [
  { id: "v-102", firstName: "Eylül", lastName: "Bilge", company: "Kuzey Hat Tedarik A.Ş.", dayOffset: 0, startHour: 11, durationMinutes: 60, status: "PLANNED", typeId: "meeting", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-merkez", note: "Tedarik sözleşmesi gözden geçirme toplantısı" },
  { id: "v-103", firstName: "Arda", lastName: "Yalım", company: "Mavi Rota Danışmanlık", dayOffset: 0, startHour: 14, startMinute: 30, durationMinutes: 90, status: "PLANNED", typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", invitationStatus: "NOT_SENT", hasAdditionalRequirements: true, additionalRequirementNote: "Toplantı odasında erişilebilir oturma düzeni hazırlanmalı." },
  { id: "v-105", firstName: "Sena", lastName: "Tanyel", company: "Rotam Kalite Sistemleri", dayOffset: 2, startHour: 11, durationMinutes: 90, status: "PLANNED", typeId: "audit", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", invitationStatus: "SENDING", note: "Proses denetimi hazırlık görüşmesi" },
  { id: "v-today-completed", firstName: "Bora", lastName: "Ilgaz", company: "Eksen Polimer Sanayi", plannedStart: scenarioMoment(-220), plannedEnd: scenarioMoment(-130), actualCheckIn: scenarioMoment(-215), actualCheckOut: scenarioMoment(-140), visitorCardReturned: true, status: "CHECKED_OUT", typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", actualMeetingEnd: scenarioMoment(-140), meetingEndSource: "VISITOR_CHECK_OUT" },
  { id: "v-today-late", firstName: "Nergis", lastName: "Koral", company: "VeriKare Yazılım A.Ş.", plannedStart: scenarioMoment(-65), plannedEnd: scenarioMoment(55), actualCheckIn: scenarioMoment(-38), status: "CHECKED_IN", typeId: "customer", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", phone: "+90 530 555 18 24" },
  { id: "v-today-overdue", firstName: "Rüzgar", lastName: "Arman", company: "Pera Teknik Çözümler", plannedStart: scenarioMoment(-185), plannedEnd: scenarioMoment(-20), actualCheckIn: scenarioMoment(-178), status: "CHECKED_IN", typeId: "audit", employeeId: "eda-karaca", companyId: "bplas", facilityId: "bplas-merkez", note: "Yıllık süreç uygunluk değerlendirmesi" },
  { id: "v-today-expected", firstName: "Ceren", lastName: "Yurt", company: "Delta Metal İşleme", plannedStart: scenarioMoment(95), plannedEnd: scenarioMoment(185), status: "PLANNED", typeId: "supplier", employeeId: "selin-aydin", creatorEmployeeId: "eda-karaca", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", invitationStatus: "SENT" },
  { id: "v-today-no-show", firstName: "Tuna", lastName: "Kıvılcım", company: "Rota Lojistik Hizmetleri", dayOffset: 0, startHour: 8, durationMinutes: 60, status: "NO_SHOW", typeId: "interview", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-today-cancelled", firstName: "İdil", lastName: "Serin", company: "Ahenk Ambalaj A.Ş.", dayOffset: 0, startHour: 16, durationMinutes: 60, status: "CANCELLED", typeId: "training", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", note: "Eğitmen takvimi değiştiği için ertelendi." },
  { id: "v-unplanned-desk", firstName: "Kuzey", lastName: "Mert", company: "Bora Elektrik Taahhüt", plannedStart: scenarioMoment(-125), plannedEnd: scenarioMoment(-35), actualCheckIn: scenarioMoment(-118), actualCheckOut: scenarioMoment(-42), visitorCardReturned: true, status: "CHECKED_OUT", typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", invitationStatus: "NOT_SENT", note: "Güvenlik masasında kaydedilen plansız klima bakım ziyareti." },
  { id: "v-invitation-failed", firstName: "Mina", lastName: "Koşal", company: "Nokta Finans Danışmanlık", dayOffset: 1, startHour: 10, durationMinutes: 60, status: "PLANNED", typeId: "meeting", employeeId: "eda-karaca", companyId: "bplas", facilityId: "bplas-merkez", invitationStatus: "FAILED" },
  { id: "v-lifecycle-active", firstName: "Levent", lastName: "Yaman", company: "Yalın Süreç Akademi", plannedStart: scenarioMoment(-30), plannedEnd: scenarioMoment(75), actualCheckIn: scenarioMoment(-25), status: "CHECKED_IN", typeId: "meeting", employeeId: "eda-karaca", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", note: "Operasyon verimliliği çalışma oturumu" },
  { id: "v-lifecycle-manual", firstName: "Dora", lastName: "Eren", company: "Kare Plan Mimarlık", dayOffset: -1, startHour: 9, durationMinutes: 120, actualCheckIn: scenarioAt(-1, 9, 5), actualCheckOut: scenarioAt(-1, 10, 42), visitorCardReturned: true, status: "CHECKED_OUT", typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", actualMeetingEnd: scenarioAt(-1, 10, 42), meetingEndSource: "MANUAL" },
  { id: "v-lifecycle-auto", firstName: "Sarp", lastName: "Önen", company: "Eko Dönüşüm Teknolojileri", dayOffset: -2, startHour: 13, durationMinutes: 90, actualCheckIn: scenarioAt(-2, 13, 8), actualCheckOut: scenarioAt(-2, 14, 47), visitorCardReturned: true, status: "CHECKED_OUT", typeId: "customer", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", actualMeetingEnd: scenarioAt(-2, 14, 47), meetingEndSource: "VISITOR_CHECK_OUT" },
]

const reportContacts = [
  ["Ayla", "Başar", "Umut Makine Sanayi", "supplier"], ["Baran", "Cevher", "Kıyı Lojistik A.Ş.", "meeting"], ["Deren", "Işın", "Armoni Kimya", "technical-service"], ["Ekin", "Sayar", "Metrik Yazılım", "customer"], ["Funda", "Pekel", "Kavşak Otomasyon", "audit"], ["Gürkan", "Alp", "Kora Kalıp", "supplier"],
] as const

function historicSeed(id: string, dayOffset: number, index: number, previousPeriod: boolean): SeedVisit {
  const [firstName, lastName, company, typeId] = reportContacts[index % reportContacts.length]
  const status: VisitStatus = index % 7 === 4 ? "NO_SHOW" : index % 9 === 6 ? "CANCELLED" : "CHECKED_OUT"
  const startHour = 9 + (index % 4)
  const startMinute = index % 2 ? 30 : 0
  const lateMinutes = index % (previousPeriod ? 6 : 4) === 0 ? 12 : 0
  const durationMinutes = (previousPeriod ? 95 : 75) + (index % 3) * 10
  const actualCheckIn = status === "CHECKED_OUT" ? scenarioAt(dayOffset, startHour, startMinute + lateMinutes) : undefined
  const actualCheckOut = status === "CHECKED_OUT" ? endFor(dayOffset, startHour, startMinute + lateMinutes, durationMinutes) : undefined
  const host = index % 4
  const scope = host === 2
    ? { employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim" }
    : host === 3
      ? { employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez" }
      : host === 1
        ? { employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge" }
        : { employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" }
  return { id, firstName, lastName, company, dayOffset, startHour, startMinute, durationMinutes, actualCheckIn, actualCheckOut, visitorCardReturned: status === "CHECKED_OUT", status, typeId, ...scope, actualMeetingEnd: status === "CHECKED_OUT" ? actualCheckOut : undefined, meetingEndSource: status === "CHECKED_OUT" ? "VISITOR_CHECK_OUT" : undefined }
}

const currentPeriodHistory = Array.from({ length: 12 }, (_, index) => historicSeed(`v-report-current-${index + 1}`, -2 - index * 2, index, false))
const previousPeriodHistory = Array.from({ length: 11 }, (_, index) => historicSeed(`v-report-previous-${index + 1}`, -32 - index * 2, index + 2, true))
const seeded = [...operationalSeeds, ...currentPeriodHistory, ...previousPeriodHistory].map(toMeetingVisit)

const workshop = toMeetingVisit({ id: "v-workshop-lead", firstName: "Yasemin", lastName: "Oral", company: "Kuzey Hat Tedarik A.Ş.", dayOffset: 4, startHour: 10, durationMinutes: 120, status: "PLANNED", typeId: "training", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", note: "Yeni ambalaj standardı bilgilendirme oturumu" })
const workshopCompanion: VisitRecord = { ...workshop.visit, id: "v-workshop-companion", visitor: { id: "visitor-v-workshop-companion", firstName: "Okan", lastName: "Başer", email: "okan.baser@ornek-firma.test", company: "Kuzey Hat Tedarik A.Ş." } }

export const initialMockMeetings = [...seeded.map((item) => item.meeting), workshop.meeting]
export const initialMockVisitRecords = [...seeded.map((item) => item.visit), workshop.visit, workshopCompanion]
