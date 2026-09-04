import type { VisitTypeDefinition } from "@/domain/admin"
import type { OrganizationSnapshot } from "@/domain/organization"
import type { InvitationStatus, Meeting, VisitRecord, VisitReferenceData, VisitStatus } from "@/domain/visits"
import { initialMockOrganizationSnapshot } from "@/services/mock-organization-store"
import { initialMockVisitTypes } from "@/services/mock-visit-type-store"
import { scenarioAt, scenarioCreatedAt, scenarioMoment } from "@/services/mock-scenario"
import type { SessionUser } from "@/services/session-service"

type VisitCurrentEmployee = VisitReferenceData["currentEmployee"]

/**
 * Deterministic identity for unit/component fixtures only. The demo runtime never uses this:
 * `createDemoServices()` passes a resolver that derives `currentEmployee` from the signed-in
 * browser session (see {@link toDemoVisitCurrentEmployee}).
 */
export const demoFixtureCurrentEmployee: VisitCurrentEmployee = {
  employeeId: "eda-karaca",
  companyId: "bplas",
  facilityId: "bplas-merkez",
  role: "MANAGER",
}

/**
 * Projects a signed-in demo session onto the Visit reference-data `currentEmployee` shape so the
 * demo path mirrors the API path (where the backend resolves identity from the session). Throws
 * rather than falling back to a fixed identity when no user is signed in.
 */
export function toDemoVisitCurrentEmployee(session: SessionUser | null): VisitCurrentEmployee {
  if (!session) {
    throw new Error("Demo ziyaret referans verisi oturum açmış bir kullanıcı gerektirir; sabit bir kimliğe geri düşülmez.")
  }
  return {
    employeeId: session.employeeId ?? "",
    companyId: session.authorizationScope?.companyIds[0] ?? "",
    facilityId: session.authorizationScope?.facilityIds[0] ?? "",
    role: session.role === "EMPLOYEE" ? "EMPLOYEE" : "MANAGER",
  }
}

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
  visitTypes: VisitTypeDefinition[] = initialMockVisitTypes,
  currentEmployee?: VisitCurrentEmployee,
): VisitReferenceData {
  if (!currentEmployee) {
    throw new Error('createMockVisitReferenceData: currentEmployee kimliği zorunludur; sabit "eda-karaca" değerine geri düşülmez.')
  }
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
    currentEmployee,
  }
}

// Legacy tests and pure UI utilities can use the initial projection. Runtime services never
// read this constant; they request a fresh projection from MockOrganizationStore.
export const mockVisitReferenceData = createMockVisitReferenceData(initialMockOrganizationSnapshot, initialMockVisitTypes, demoFixtureCurrentEmployee)

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
  visitorCardId?: string
  visitorCardNumber?: string
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
  hostCorrectedFrom?: string
  hostCorrectedAt?: string
  hostCorrectedBy?: string
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
      visitorCardId: seed.visitorCardId,
      visitorCardNumber: seed.visitorCardNumber,
      visitorCardReturned: seed.visitorCardReturned,
      hostCorrectedFrom: seed.hostCorrectedFrom,
      hostCorrectedAt: seed.hostCorrectedAt,
      hostCorrectedBy: seed.hostCorrectedBy,
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
  { id: "v-today-late", firstName: "Nergis", lastName: "Koral", company: "VeriKare Yazılım A.Ş.", plannedStart: scenarioMoment(-65), plannedEnd: scenarioMoment(55), actualCheckIn: scenarioMoment(-38), visitorCardId: "card-2", visitorCardNumber: "002", status: "CHECKED_IN", typeId: "customer", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", phone: "+90 530 555 18 24" },
  { id: "v-today-overdue", firstName: "Rüzgar", lastName: "Arman", company: "Pera Teknik Çözümler", plannedStart: scenarioMoment(-185), plannedEnd: scenarioMoment(-20), actualCheckIn: scenarioMoment(-178), visitorCardId: "card-7", visitorCardNumber: "007", status: "CHECKED_IN", typeId: "audit", employeeId: "eda-karaca", companyId: "bplas", facilityId: "bplas-merkez", note: "Yıllık süreç uygunluk değerlendirmesi" },
  { id: "v-today-expected", firstName: "Ceren", lastName: "Yurt", company: "Delta Metal İşleme", plannedStart: scenarioMoment(95), plannedEnd: scenarioMoment(185), status: "PLANNED", typeId: "supplier", employeeId: "selin-aydin", creatorEmployeeId: "eda-karaca", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", invitationStatus: "SENT" },
  { id: "v-today-no-show", firstName: "Tuna", lastName: "Kıvılcım", company: "Rota Lojistik Hizmetleri", dayOffset: 0, startHour: 8, durationMinutes: 60, status: "NO_SHOW", typeId: "interview", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-today-cancelled", firstName: "İdil", lastName: "Serin", company: "Ahenk Ambalaj A.Ş.", dayOffset: 0, startHour: 16, durationMinutes: 60, status: "CANCELLED", typeId: "training", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", note: "Eğitmen takvimi değiştiği için ertelendi." },
  { id: "v-unplanned-desk", firstName: "Kuzey", lastName: "Mert", company: "Bora Elektrik Taahhüt", plannedStart: scenarioMoment(-125), plannedEnd: scenarioMoment(-35), actualCheckIn: scenarioMoment(-118), actualCheckOut: scenarioMoment(-42), visitorCardReturned: true, status: "CHECKED_OUT", typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", invitationStatus: "NOT_SENT", note: "Güvenlik masasında kaydedilen plansız klima bakım ziyareti." },
  { id: "v-invitation-failed", firstName: "Mina", lastName: "Koşal", company: "Nokta Finans Danışmanlık", dayOffset: 1, startHour: 10, durationMinutes: 60, status: "PLANNED", typeId: "meeting", employeeId: "eda-karaca", companyId: "bplas", facilityId: "bplas-merkez", invitationStatus: "FAILED" },
  { id: "v-lifecycle-active", firstName: "Levent", lastName: "Yaman", company: "Yalın Süreç Akademi", plannedStart: scenarioMoment(-30), plannedEnd: scenarioMoment(75), actualCheckIn: scenarioMoment(-25), visitorCardId: "card-8", visitorCardNumber: "008", status: "CHECKED_IN", typeId: "meeting", employeeId: "eda-karaca", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", note: "Operasyon verimliliği çalışma oturumu" },
  { id: "v-maya-soon", firstName: "Aylin", lastName: "Koca", company: "Kıyı Kalıp Teknolojileri", plannedStart: scenarioMoment(85), plannedEnd: scenarioMoment(155), status: "PLANNED", typeId: "supplier", employeeId: "maya-kara", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-maya-later", firstName: "Berk", lastName: "Savaş", company: "Pusula Endüstri Çözümleri", plannedStart: scenarioMoment(190), plannedEnd: scenarioMoment(280), status: "PLANNED", typeId: "meeting", employeeId: "maya-kara", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-maya-overlap", firstName: "Cansu", lastName: "Erim", company: "Arma Teknik Hizmetler", plannedStart: scenarioMoment(105), plannedEnd: scenarioMoment(195), status: "PLANNED", typeId: "customer", employeeId: "maya-kara", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-maya-aylin-koca-urun-gelistirme-is-ortakligi", firstName: "Dilan", lastName: "Özkan", company: "Meridyen Ürün Geliştirme ve Endüstriyel Tasarım Hizmetleri A.Ş.", dayOffset: 1, startHour: 9, startMinute: 30, durationMinutes: 75, status: "PLANNED", typeId: "audit", employeeId: "maya-kara", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-maya-different-facility", firstName: "Efe", lastName: "Aydemir", company: "Yön Teknik Otomasyon", dayOffset: 2, startHour: 11, durationMinutes: 90, status: "PLANNED", typeId: "technical-service", employeeId: "emre-yilmaz", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-arge" },
  { id: "v-maya-cancelled", firstName: "Filiz", lastName: "Tan", company: "Duru Ambalaj Sistemleri", dayOffset: 1, startHour: 14, durationMinutes: 60, status: "CANCELLED", typeId: "training", employeeId: "maya-kara", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", note: "Katılımcı programı değiştiği için iptal edildi." },
  { id: "v-maya-overdue", firstName: "Gökçe", lastName: "Yalçın", company: "Kareks Süreç Danışmanlık", plannedStart: scenarioMoment(-170), plannedEnd: scenarioMoment(-25), actualCheckIn: scenarioMoment(-165), visitorCardId: "card-16", visitorCardNumber: "016", status: "CHECKED_IN", typeId: "meeting", employeeId: "maya-kara", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-maya-invitation-failed", firstName: "Hakan", lastName: "Sönmez", company: "Eksen Proje Mühendislik", dayOffset: 1, startHour: 13, durationMinutes: 60, status: "PLANNED", typeId: "supplier", employeeId: "maya-kara", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", invitationStatus: "FAILED" },
  { id: "v-maya-checked-out", firstName: "İpek", lastName: "Bayar", company: "Mavi Hat Lojistik", plannedStart: scenarioMoment(-220), plannedEnd: scenarioMoment(-130), actualCheckIn: scenarioMoment(-215), actualCheckOut: scenarioMoment(-140), visitorCardReturned: true, status: "CHECKED_OUT", typeId: "customer", employeeId: "maya-kara", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", actualMeetingEnd: scenarioMoment(-140), meetingEndSource: "VISITOR_CHECK_OUT" },
  { id: "v-maya-no-show", firstName: "Jale", lastName: "Ekin", company: "Kuzey Test Laboratuvarı", dayOffset: 0, startHour: 8, durationMinutes: 60, status: "NO_SHOW", typeId: "interview", employeeId: "maya-kara", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-maya-after-hours", firstName: "Mert", lastName: "Aydin", company: "Akşam Bakım Hizmetleri", dayOffset: 0, startHour: 19, durationMinutes: 60, status: "PLANNED", typeId: "technical-service", employeeId: "maya-kara", creatorEmployeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-expected-1", firstName: "Buse", lastName: "Tekin", company: "Marmara Hassas Parça Sanayi", dayOffset: 0, startHour: 8, durationMinutes: 60, status: "PLANNED", typeId: "supplier", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-expected-2", firstName: "Cihat", lastName: "Eroğlu", company: "Doruk Endüstri Sistemleri", dayOffset: 0, startHour: 9, startMinute: 15, durationMinutes: 60, status: "PLANNED", typeId: "meeting", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-expected-3", firstName: "Elif", lastName: "Köksal", company: "Yakamoz Teknik Tedarik", dayOffset: 0, startHour: 10, startMinute: 30, durationMinutes: 90, status: "PLANNED", typeId: "customer", employeeId: "eda-karaca", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-expected-4", firstName: "Hakan", lastName: "Duman", company: "Vadi Kalıp Tasarım", dayOffset: 0, startHour: 11, startMinute: 45, durationMinutes: 80, status: "PLANNED", typeId: "technical-service", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-expected-5", firstName: "Melis", lastName: "Özbek", company: "Kule Proje Mühendislik", dayOffset: 0, startHour: 13, durationMinutes: 60, status: "PLANNED", typeId: "audit", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-expected-6", firstName: "Onur", lastName: "Taşçı", company: "Rota Kompozit Teknolojileri", dayOffset: 0, startHour: 14, startMinute: 15, durationMinutes: 90, status: "PLANNED", typeId: "supplier", employeeId: "eda-karaca", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-expected-7", firstName: "Pelin", lastName: "Ergün", company: "Eksenel Otomasyon Çözümleri", dayOffset: 0, startHour: 15, startMinute: 30, durationMinutes: 60, status: "PLANNED", typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-expected-8", firstName: "Tolga", lastName: "Şener", company: "Ufuk Enerji Kontrol", dayOffset: 0, startHour: 18, startMinute: 30, durationMinutes: 90, status: "PLANNED", typeId: "customer", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-inside-long", firstName: "Zeynep Gülsevinç", lastName: "Karamehmetoğlu", company: "Anadolu Endüstriyel Otomasyon ve Danışmanlık Hizmetleri A.Ş.", plannedStart: scenarioMoment(-150), plannedEnd: scenarioMoment(30), actualCheckIn: scenarioMoment(-145), visitorCardId: "card-9", visitorCardNumber: "009", status: "CHECKED_IN", typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-inside-now", firstName: "Barış", lastName: "Köseoğlu", company: "Kıyı Makine Sanayi", plannedStart: scenarioMoment(-5), plannedEnd: scenarioMoment(85), actualCheckIn: scenarioMoment(0), visitorCardId: "card-10", visitorCardNumber: "010", status: "CHECKED_IN", typeId: "supplier", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-inside-host-audit", firstName: "Derya", lastName: "Akalın", company: "Pusula Kimya Teknolojileri", plannedStart: scenarioMoment(-120), plannedEnd: scenarioMoment(20), actualCheckIn: scenarioMoment(-112), visitorCardId: "card-11", visitorCardNumber: "011", status: "CHECKED_IN", typeId: "audit", employeeId: "eda-karaca", companyId: "bplas", facilityId: "bplas-merkez", hostCorrectedFrom: "Maya Karaca", hostCorrectedAt: scenarioMoment(-110), hostCorrectedBy: "Eda Karaca" },
  { id: "v-security-inside-phone", firstName: "Fırat", lastName: "Orhan", company: "Güney Bağlantı Elemanları", plannedStart: scenarioMoment(-80), plannedEnd: scenarioMoment(70), actualCheckIn: scenarioMoment(-75), visitorCardId: "card-12", visitorCardNumber: "012", status: "CHECKED_IN", typeId: "technical-service", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", phone: "+90 533 742 16 90" },
  { id: "v-security-inside-5", firstName: "İrem", lastName: "Yazgan", company: "Köprü Test Laboratuvarı", plannedStart: scenarioMoment(-210), plannedEnd: scenarioMoment(-10), actualCheckIn: scenarioMoment(-205), visitorCardId: "card-13", visitorCardNumber: "013", status: "CHECKED_IN", typeId: "customer", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-inside-6", firstName: "Kaan", lastName: "Balcı", company: "Metropol Endüstri Bakım", plannedStart: scenarioMoment(-180), plannedEnd: scenarioMoment(-40), actualCheckIn: scenarioMoment(-175), visitorCardId: "card-14", visitorCardNumber: "014", status: "CHECKED_IN", typeId: "supplier", employeeId: "eda-karaca", companyId: "bplas", facilityId: "bplas-merkez" },
  { id: "v-security-inside-7", firstName: "Nalan", lastName: "Kurt", company: "Sarmal Plastik Teknolojileri", plannedStart: scenarioMoment(-60), plannedEnd: scenarioMoment(90), actualCheckIn: scenarioMoment(-55), visitorCardId: "card-15", visitorCardNumber: "015", status: "CHECKED_IN", typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez" },
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
