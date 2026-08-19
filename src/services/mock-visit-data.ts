import { addDays, addHours, setHours, setMinutes, startOfDay, subDays } from "date-fns"

import type { InvitationStatus, Meeting, VisitRecord, VisitReferenceData, VisitStatus } from "@/domain/visits"

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
    { id: "atahan-bora-bozkurt", companyId: "bplas", facilityIds: ["bplas-merkez", "bplas-arge", "otomotiv-uretim", "anadolu-lojistik-merkez"], name: "Atahan Bora Bozkurt", department: "Yönetim" },
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
    { id: "training", name: "Eğitim" },
  ],
  currentEmployee: {
    employeeId: "atahan-bora-bozkurt",
    companyId: "bplas",
    facilityId: "bplas-merkez",
    role: "MANAGER",
  },
}

function at(day: Date, hour: number, minute = 0) {
  return setMinutes(setHours(startOfDay(day), hour), minute).toISOString()
}

interface SeedVisit {
  id: string
  creatorEmployeeId?: string
  firstName: string
  lastName: string
  email: string
  company: string
  day: Date
  startHour: number
  startMinute?: number
  durationHours: number
  actualCheckIn?: string
  actualCheckOut?: string
  visitorCardReturned?: boolean
  typeId: string
  employeeId: string
  companyId: string
  facilityId: string
  status: VisitStatus
  invitationStatus?: InvitationStatus
  phone?: string
  note?: string
  hasAdditionalRequirements?: boolean
  additionalRequirementNote?: string
  // Lifecycle fields — used to seed meetings with known closure states
  actualMeetingEnd?: string
  meetingEndSource?: "MANUAL" | "VISITOR_CHECK_OUT"
}

interface SeededMeetingVisit {
  meeting: Meeting
  visit: VisitRecord
}

function toVisit(seed: SeedVisit): SeededMeetingVisit {
  const type = mockVisitReferenceData.visitTypes.find((item) => item.id === seed.typeId)!
  const employee = mockVisitReferenceData.employees.find((item) => item.id === seed.employeeId)!
  const company = mockVisitReferenceData.companies.find((item) => item.id === seed.companyId)!
  const facility = mockVisitReferenceData.facilities.find((item) => item.id === seed.facilityId)!
  const plannedStart = at(seed.day, seed.startHour, seed.startMinute)
  const plannedEnd = addHours(new Date(plannedStart), seed.durationHours).toISOString()
  const timestamp = subDays(new Date(), 3).toISOString()

  const meetingId = `meeting-${seed.id}`

  return {
    meeting: {
      id: meetingId,
      creatorEmployeeId: seed.creatorEmployeeId ?? seed.employeeId,
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
      createdAt: timestamp,
      updatedAt: timestamp,
      actualMeetingEnd: seed.actualMeetingEnd,
      meetingEndSource: seed.meetingEndSource,
    },
    visit: {
      id: seed.id,
      meetingId,
      visitor: {
        id: `visitor-${seed.id}`,
        firstName: seed.firstName,
        lastName: seed.lastName,
        email: seed.email,
        company: seed.company,
        phone: seed.phone,
      },
      actualCheckIn: seed.actualCheckIn,
      actualCheckOut: seed.actualCheckOut,
      visitorCardReturned: seed.visitorCardReturned,
      status: seed.status,
      invitationStatus: seed.invitationStatus ?? "SENT",
      invitationSentAt: (seed.invitationStatus ?? "SENT") === "SENT" ? timestamp : undefined,
      invitationError: seed.invitationStatus === "FAILED" ? "Davet teknik bir hata nedeniyle gönderilemedi." : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      cancelledAt: seed.status === "CANCELLED" ? subDays(new Date(), 1).toISOString() : undefined,
    },
  }
}

const today = new Date()
const densityTestDay = addDays(today, 8)

const initialMockMeetingVisits: SeededMeetingVisit[] = [
  toVisit({ id: "v-101", firstName: "Deniz", lastName: "Aksoy", email: "deniz.aksoy@example.com", company: "Vega Endüstri Ltd. Şti.", day: today, startHour: 9, durationHours: 1.5, actualCheckIn: at(today, 9), actualCheckOut: at(today, 10, 35), visitorCardReturned: false, typeId: "supplier", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_OUT" }),
  toVisit({ id: "v-102", firstName: "Cem", lastName: "Ergin", email: "cem.ergin@example.com", company: "Marmara Lojistik A.Ş.", day: today, startHour: 11, durationHours: 1, actualCheckIn: at(today, 10, 50), visitorCardReturned: false, typeId: "meeting", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_IN", note: "Ürün tasarım değerlendirmesi" }),
  toVisit({ id: "v-103", firstName: "Lara", lastName: "Şen", email: "lara.sen@example.com", company: "Akın Tedarik A.Ş.", phone: "+90 532 111 22 33", day: today, startHour: 14, startMinute: 30, durationHours: 1.5, typeId: "customer", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED", invitationStatus: "NOT_SENT", hasAdditionalRequirements: true, additionalRequirementNote: "Tekerlekli sandalye erişimi hazırlanmalı." }),
  toVisit({ id: "v-104", creatorEmployeeId: "atahan-bora-bozkurt", firstName: "Ozan", lastName: "Acar", email: "ozan.acar@example.com", company: "Doğuş Mühendislik", day: addDays(today, 1), startHour: 10, durationHours: 2, typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED", invitationStatus: "FAILED", note: "Soğutma sistemi kontrolü" }),
  toVisit({ id: "v-105", creatorEmployeeId: "atahan-bora-bozkurt", firstName: "Ece", lastName: "Koç", email: "ece.koc@example.com", company: "Silverline Teknoloji", day: addDays(today, 2), startHour: 13, durationHours: 1, typeId: "audit", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "PLANNED", invitationStatus: "SENDING", hasAdditionalRequirements: true, additionalRequirementNote: "Denetim dosyaları için kilitli dolap gerekli." }),
  toVisit({ id: "v-106", firstName: "Can", lastName: "Öz", email: "can.oz@example.com", company: "Vega Endüstri Ltd. Şti.", day: subDays(today, 1), startHour: 15, durationHours: 1, typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CANCELLED" }),
  toVisit({ id: "v-107", firstName: "Ada", lastName: "Güneş", email: "ada.gunes@example.com", company: "Nova Elektronik", day: subDays(today, 2), startHour: 10, durationHours: 1, typeId: "interview", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "NO_SHOW" }),
  toVisit({ id: "v-108", firstName: "Bora", lastName: "Tuna", email: "bora.tuna@example.com", company: "Marmara Lojistik A.Ş.", day: addDays(today, 5), startHour: 9, startMinute: 30, durationHours: 2, typeId: "supplier", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", status: "PLANNED" }),
  toVisit({ id: "v-109", firstName: "Alara", lastName: "Yalçın", email: "alara.yalcin@example.com", company: "Akın Tedarik A.Ş.", day: densityTestDay, startHour: 9, durationHours: 1.5, typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-110", firstName: "Mert", lastName: "Arı", email: "mert.ari@example.com", company: "Bereket Gıda San. Tic.", day: densityTestDay, startHour: 9, startMinute: 30, durationHours: 1, typeId: "supplier", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED" }),
  toVisit({ id: "v-111", firstName: "Nil", lastName: "Eren", email: "nil.eren@example.com", company: "Pusula Danışmanlık", day: densityTestDay, startHour: 10, durationHours: 0.5, typeId: "interview", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-112", firstName: "Tolga", lastName: "Işık", email: "tolga.isik@example.com", company: "Yıldız Kalıp ve Makine", day: densityTestDay, startHour: 11, durationHours: 1, typeId: "customer", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "PLANNED" }),
  toVisit({ id: "v-113", firstName: "Derya", lastName: "Polat", email: "derya.polat@example.com", company: "Vega Endüstri Ltd. Şti.", day: densityTestDay, startHour: 13, durationHours: 2, typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-114", firstName: "Kaan", lastName: "Bulut", email: "kaan.bulut@example.com", company: "Global Parça Tedarik", day: densityTestDay, startHour: 13, startMinute: 30, durationHours: 0.5, typeId: "audit", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-115", firstName: "Aslı", lastName: "Sönmez", email: "asli.sonmez@example.com", company: "Anka Nakliyat", day: addDays(today, 3), startHour: 9, durationHours: 1, typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-116", firstName: "Barış", lastName: "Ateş", email: "baris.ates@example.com", company: "Marmara Lojistik A.Ş.", day: addDays(today, 4), startHour: 15, durationHours: 1, typeId: "supplier", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED" }),
  toVisit({ id: "v-117", firstName: "İpek", lastName: "Kurt", email: "ipek.kurt@example.com", company: "Ege Kimya Sanayi", day: addDays(today, 6), startHour: 10, durationHours: 1.5, typeId: "customer", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "PLANNED" }),
  toVisit({ id: "v-118", firstName: "Onur", lastName: "Yüce", email: "onur.yuce@example.com", company: "Akın Tedarik A.Ş.", day: addDays(today, 7), startHour: 14, durationHours: 1, typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-119", firstName: "Zeynep", lastName: "Tan", email: "zeynep.tan@example.com", company: "Meridyen Yazılım", day: addDays(today, 10), startHour: 11, durationHours: 1, typeId: "audit", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", status: "PLANNED" }),
  toVisit({ id: "v-120", creatorEmployeeId: "atahan-bora-bozkurt", firstName: "Ayca", lastName: "Korkmaz", email: "ayca.korkmaz@example.com", company: "Trakya Ambalaj", day: today, startHour: 8, startMinute: 30, durationHours: 1, typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-121", firstName: "Hakan", lastName: "Celik", email: "hakan.celik@example.com", company: "Vega Endüstri Ltd. Şti.", day: today, startHour: 10, durationHours: 1, typeId: "supplier", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED" }),
  toVisit({ id: "v-122", firstName: "Sibel", lastName: "Arslan", email: "sibel.arslan@example.com", company: "Orion Elektrik", day: today, startHour: 11, startMinute: 30, durationHours: 0.5, typeId: "audit", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-123", firstName: "Yusuf", lastName: "Kaya", email: "yusuf.kaya@example.com", company: "Marmara Lojistik A.Ş.", day: today, startHour: 13, durationHours: 2, typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED" }),
  toVisit({ id: "v-124", firstName: "Melis", lastName: "Tunc", email: "melis.tunc@example.com", company: "Bosphorus Consulting", day: addDays(today, 1), startHour: 9, durationHours: 1, typeId: "customer", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "PLANNED" }),
  toVisit({ id: "v-125", firstName: "Berk", lastName: "Ekin", email: "berk.ekin@example.com", company: "Akın Tedarik A.Ş.", day: addDays(today, 1), startHour: 11, startMinute: 30, durationHours: 1, typeId: "interview", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-126", firstName: "Nisa", lastName: "Guler", email: "nisa.guler@example.com", company: "Nova Elektronik", day: addDays(today, 3), startHour: 10, startMinute: 30, durationHours: 1, typeId: "supplier", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED" }),
  toVisit({ id: "v-127", firstName: "Elif", lastName: "Kaya", email: "elif.kaya@example.com", company: "Vega Endüstri Ltd. Şti.", day: today, startHour: 8, durationHours: 1, actualCheckIn: at(today, 8, 5), actualCheckOut: at(today, 8, 58), visitorCardReturned: true, typeId: "training", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_OUT", note: "Yeni tedarikçi kalite eğitimi" }),
  toVisit({ id: "v-128", firstName: "Ahmet", lastName: "Korkut", email: "ahmet.korkut@example.com", company: "Silverline Teknoloji", day: today, startHour: 9, durationHours: 2, actualCheckIn: at(today, 9, 8), actualCheckOut: at(today, 10, 52), visitorCardReturned: true, typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "CHECKED_OUT" }),
  toVisit({ id: "v-129", firstName: "Gökçe", lastName: "Aydın", email: "gokce.aydin@example.com", company: "Marmara Lojistik A.Ş.", day: today, startHour: 9, startMinute: 30, durationHours: 1, actualCheckIn: at(today, 9, 36), actualCheckOut: at(today, 10, 25), visitorCardReturned: true, typeId: "interview", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_OUT" }),
  toVisit({ id: "v-130", firstName: "Serhat", lastName: "Baş", email: "serhat.bas@example.com", company: "Doğuş Mühendislik", day: today, startHour: 10, durationHours: 1.5, actualCheckIn: at(today, 10, 12), visitorCardReturned: false, typeId: "audit", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "CHECKED_IN", note: "Sistem denetimi" }),
  toVisit({ id: "v-131", firstName: "Dilan", lastName: "Sarı", email: "dilan.sari@example.com", company: "Akın Tedarik A.Ş.", day: today, startHour: 10, startMinute: 30, durationHours: 1, actualCheckIn: at(today, 10, 38), visitorCardReturned: false, typeId: "customer", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_IN" }),
  toVisit({ id: "v-132", firstName: "Murat", lastName: "Tekin", email: "murat.tekin@example.com", company: "Yıldız Kalıp ve Makine", day: today, startHour: 11, durationHours: 1, actualCheckIn: at(today, 11, 4), visitorCardReturned: false, typeId: "supplier", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "CHECKED_IN" }),
  toVisit({ id: "v-133", firstName: "Cansu", lastName: "Gür", email: "cansu.gur@example.com", company: "Vega Endüstri Ltd. Şti.", day: today, startHour: 11, startMinute: 30, durationHours: 1, actualCheckIn: at(today, 11, 35), actualCheckOut: at(today, 12, 18), visitorCardReturned: true, typeId: "meeting", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", status: "CHECKED_OUT" }),
  toVisit({ id: "v-134", firstName: "Rıza", lastName: "Öztürk", email: "riza.ozturk@example.com", company: "Pusula Danışmanlık", day: today, startHour: 12, durationHours: 1, typeId: "interview", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "NO_SHOW" }),
  toVisit({ id: "v-135", firstName: "Selma", lastName: "Ekin", email: "selma.ekin@example.com", company: "Marmara Lojistik A.Ş.", day: today, startHour: 12, startMinute: 30, durationHours: 1, typeId: "training", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "CANCELLED", note: "Katılımcı talebiyle iptal edildi" }),
  toVisit({ id: "v-136", firstName: "Pelin", lastName: "Gül", email: "pelin.gul@example.com", company: "Global Parça Tedarik", day: today, startHour: 13, durationHours: 1, typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-137", firstName: "Oğuz", lastName: "Koşar", email: "oguz.kosar@example.com", company: "Akın Tedarik A.Ş.", day: today, startHour: 13, startMinute: 30, durationHours: 1.5, typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED" }),
  toVisit({ id: "v-138", firstName: "Naz", lastName: "Er", email: "naz.er@example.com", company: "Ege Kimya Sanayi", day: today, startHour: 14, durationHours: 1, typeId: "audit", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "PLANNED" }),
  toVisit({ id: "v-139", firstName: "Yalın", lastName: "Çetin", email: "yalin.cetin@example.com", company: "Vega Endüstri Ltd. Şti.", day: today, startHour: 15, durationHours: 1, typeId: "supplier", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", status: "PLANNED" }),
  toVisit({ id: "v-140", firstName: "Begüm", lastName: "Yüksel", email: "begum.yuksel@example.com", company: "Anka Nakliyat", day: today, startHour: 15, startMinute: 30, durationHours: 1, typeId: "customer", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-141", firstName: "Levent", lastName: "Ersoy", email: "levent.ersoy@example.com", company: "Marmara Lojistik A.Ş.", day: today, startHour: 16, durationHours: 1.5, typeId: "training", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "PLANNED" }),
  toVisit({ id: "v-142", firstName: "Seda", lastName: "Kılıç", email: "seda.kilic@example.com", company: "Meridyen Yazılım", day: today, startHour: 17, durationHours: 1, typeId: "meeting", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED" }),
  toVisit({ id: "v-143", creatorEmployeeId: "atahan-bora-bozkurt", firstName: "İrem", lastName: "Uslu", email: "irem.uslu@example.com", company: "Akın Tedarik A.Ş.", day: today, startHour: 8, durationHours: 1, actualCheckIn: at(today, 8, 7), actualCheckOut: at(today, 8, 54), visitorCardReturned: true, typeId: "meeting", employeeId: "atahan-bora-bozkurt", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_OUT", note: "Haftalık operasyon değerlendirmesi" }),
  toVisit({ id: "v-144", creatorEmployeeId: "atahan-bora-bozkurt", firstName: "Taylan", lastName: "Gök", email: "taylan.gok@example.com", company: "Trakya Ambalaj", day: today, startHour: 9, startMinute: 30, durationHours: 2, actualCheckIn: at(today, 9, 42), visitorCardReturned: false, typeId: "audit", employeeId: "atahan-bora-bozkurt", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_IN", note: "Yıllık kalite denetimi için doküman incelemesi" }),
  toVisit({ id: "v-145", firstName: "Sinem", lastName: "Aras", email: "sinem.aras@example.com", company: "Vega Endüstri Ltd. Şti.", day: today, startHour: 11, durationHours: 1, actualCheckIn: at(today, 11, 10), actualCheckOut: at(today, 11, 50), visitorCardReturned: true, typeId: "interview", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_OUT" }),
  toVisit({ id: "v-146", firstName: "Fırat", lastName: "Erdem", email: "firat.erdem@example.com", company: "Orion Elektrik", day: today, startHour: 13, startMinute: 30, durationHours: 1.5, typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED", note: "Test cihazı kalibrasyonu" }),
  toVisit({ id: "v-147", creatorEmployeeId: "atahan-bora-bozkurt", firstName: "Eylül", lastName: "Bayram", email: "eylul.bayram@example.com", company: "Marmara Lojistik A.Ş.", day: today, startHour: 15, durationHours: 1, typeId: "customer", employeeId: "atahan-bora-bozkurt", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-148", firstName: "Koray", lastName: "Deniz", email: "koray.deniz@example.com", company: "Bosphorus Consulting", day: today, startHour: 16, startMinute: 30, durationHours: 1, typeId: "supplier", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED" }),
  toVisit({ id: "v-149", firstName: "Buse", lastName: "Akın", email: "buse.akin@example.com", company: "Akın Tedarik A.Ş.", day: today, startHour: 18, durationHours: 1, typeId: "training", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED", note: "Gece vardiyası eğitim oturumu" }),
  toVisit({ id: "v-150", creatorEmployeeId: "atahan-bora-bozkurt", firstName: "Hüseyin", lastName: "Taş", email: "huseyin.tas@example.com", company: "Nova Elektronik", day: addDays(today, 1), startHour: 8, startMinute: 30, durationHours: 1, typeId: "meeting", employeeId: "atahan-bora-bozkurt", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-151", firstName: "Nehir", lastName: "Köse", email: "nehir.kose@example.com", company: "Vega Endüstri Ltd. Şti.", day: addDays(today, 1), startHour: 10, durationHours: 2, typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED" }),
  toVisit({ id: "v-152", firstName: "Arda", lastName: "Gültekin", email: "arda.gultekin@example.com", company: "Silverline Teknoloji", day: addDays(today, 2), startHour: 11, durationHours: 1, typeId: "audit", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "PLANNED" }),
  toVisit({ id: "v-153", firstName: "Mina", lastName: "Kaya", email: "mina.kaya@example.com", company: "Marmara Lojistik A.Ş.", day: addDays(today, 3), startHour: 9, startMinute: 30, durationHours: 1, typeId: "customer", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", status: "PLANNED" }),
  toVisit({ id: "v-154", firstName: "Çağrı", lastName: "Kurt", email: "cagri.kurt@example.com", company: "Yıldız Kalıp ve Makine", day: addDays(today, 4), startHour: 14, durationHours: 1.5, typeId: "supplier", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-155", firstName: "Ceren", lastName: "Özer", email: "ceren.ozer@example.com", company: "Akın Tedarik A.Ş.", day: addDays(today, 5), startHour: 10, durationHours: 1, typeId: "interview", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "PLANNED" }),
  toVisit({ id: "v-156", creatorEmployeeId: "atahan-bora-bozkurt", firstName: "Umut", lastName: "Şahin", email: "umut.sahin@example.com", company: "Pusula Danışmanlık", day: subDays(today, 1), startHour: 14, durationHours: 1, typeId: "training", employeeId: "atahan-bora-bozkurt", companyId: "bplas", facilityId: "bplas-merkez", status: "CANCELLED", note: "Eğitmen programı değişti" }),
  toVisit({ id: "v-157", firstName: "Dora", lastName: "Kara", email: "dora.kara@example.com", company: "Vega Endüstri Ltd. Şti.", day: subDays(today, 2), startHour: 10, durationHours: 1, typeId: "interview", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "NO_SHOW" }),
  toVisit({ id: "v-158", firstName: "Kuzey", lastName: "Yalçın", email: "kuzey.yalcin@example.com", company: "Marmara Lojistik A.Ş.", day: subDays(today, 3), startHour: 11, durationHours: 1.5, actualCheckIn: at(subDays(today, 3), 11, 6), actualCheckOut: at(subDays(today, 3), 12, 20), visitorCardReturned: true, typeId: "supplier", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "CHECKED_OUT" }),
  // --- Previous-period comparison seed rows -------------------------------
  // Dated 30–59 days ago so they land in the "Önceki dönem" window the Reports > Ziyaret
  // Analizi comparison computes for the default last-30-days range (today-59..today-30),
  // while staying outside that current range themselves. Deliberately shaped so the four
  // compared metrics move in different directions against the current period's values
  // (total ~39/actuallyCheckedIn 17/avg duration ~67min/lateArrivals 15): total and late
  // arrivals lower here (current shows an increase), actually-checked-in and average
  // duration higher here (current shows a decrease) — so both up and down deltas are
  // exercised, not just one direction.
  toVisit({ id: "v-p201", firstName: "Aylin", lastName: "Toprak", email: "aylin.toprak@example.com", company: "Vega Endüstri Ltd. Şti.", day: subDays(today, 55), startHour: 9, durationHours: 1.5, actualCheckIn: at(subDays(today, 55), 9, 0), actualCheckOut: at(subDays(today, 55), 10, 10), visitorCardReturned: true, typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_OUT" }),
  toVisit({ id: "v-p202", firstName: "Burak", lastName: "Yıldıray", email: "burak.yildiray@example.com", company: "Doğuş Mühendislik", day: subDays(today, 53), startHour: 9, startMinute: 30, durationHours: 1.5, actualCheckIn: at(subDays(today, 53), 9, 30), actualCheckOut: at(subDays(today, 53), 10, 50), visitorCardReturned: true, typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "CHECKED_OUT" }),
  toVisit({ id: "v-p203", firstName: "Ceyda", lastName: "Erim", email: "ceyda.erim@example.com", company: "Nova Elektronik", day: subDays(today, 50), startHour: 10, durationHours: 2, actualCheckIn: at(subDays(today, 50), 10, 15), actualCheckOut: at(subDays(today, 50), 11, 45), visitorCardReturned: true, typeId: "audit", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "CHECKED_OUT" }),
  toVisit({ id: "v-p204", firstName: "Devrim", lastName: "Katır", email: "devrim.katir@example.com", company: "Bereket Gıda San. Tic.", day: subDays(today, 47), startHour: 10, startMinute: 30, durationHours: 2, actualCheckIn: at(subDays(today, 47), 10, 30), actualCheckOut: at(subDays(today, 47), 12, 10), visitorCardReturned: true, typeId: "supplier", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", status: "CHECKED_OUT" }),
  toVisit({ id: "v-p205", firstName: "Esin", lastName: "Bulur", email: "esin.bulur@example.com", company: "Silverline Teknoloji", day: subDays(today, 44), startHour: 11, durationHours: 2, actualCheckIn: at(subDays(today, 44), 11, 0), actualCheckOut: at(subDays(today, 44), 12, 50), visitorCardReturned: true, typeId: "customer", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_OUT" }),
  toVisit({ id: "v-p206", firstName: "Ferhat", lastName: "Onat", email: "ferhat.onat@example.com", company: "Pusula Danışmanlık", day: subDays(today, 41), startHour: 11, startMinute: 30, durationHours: 2.5, actualCheckIn: at(subDays(today, 41), 11, 50), actualCheckOut: at(subDays(today, 41), 13, 50), visitorCardReturned: true, typeId: "interview", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "CHECKED_OUT" }),
  toVisit({ id: "v-p207", firstName: "Gizem", lastName: "Aker", email: "gizem.aker@example.com", company: "Orion Elektrik", day: subDays(today, 31), startHour: 9, durationHours: 1, actualCheckIn: at(subDays(today, 31), 9, 0), typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_IN" }),
  toVisit({ id: "v-p208", firstName: "Halil", lastName: "Sezer", email: "halil.sezer@example.com", company: "Global Parça Tedarik", day: subDays(today, 32), startHour: 10, durationHours: 1, actualCheckIn: at(subDays(today, 32), 10, 0), typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "CHECKED_IN" }),
  toVisit({ id: "v-p209", firstName: "Idil", lastName: "Barış", email: "idil.baris@example.com", company: "Yıldız Kalıp ve Makine", day: subDays(today, 34), startHour: 11, durationHours: 1, actualCheckIn: at(subDays(today, 34), 11, 0), typeId: "audit", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "CHECKED_IN" }),
  toVisit({ id: "v-p210", firstName: "Jale", lastName: "Ünal", email: "jale.unal@example.com", company: "Ege Kimya Sanayi", day: subDays(today, 35), startHour: 13, durationHours: 1, actualCheckIn: at(subDays(today, 35), 13, 0), typeId: "supplier", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", status: "CHECKED_IN" }),
  toVisit({ id: "v-p211", firstName: "Kemal", lastName: "Duru", email: "kemal.duru@example.com", company: "Trakya Ambalaj", day: subDays(today, 37), startHour: 14, durationHours: 1, actualCheckIn: at(subDays(today, 37), 14, 0), typeId: "customer", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_IN" }),
  toVisit({ id: "v-p212", firstName: "Leyla", lastName: "Coşar", email: "leyla.cosar@example.com", company: "Meridyen Yazılım", day: subDays(today, 38), startHour: 9, startMinute: 30, durationHours: 1, actualCheckIn: at(subDays(today, 38), 9, 30), typeId: "interview", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "CHECKED_IN" }),
  toVisit({ id: "v-p213", firstName: "Metin", lastName: "Kaplan", email: "metin.kaplan@example.com", company: "Bosphorus Consulting", day: subDays(today, 42), startHour: 10, startMinute: 30, durationHours: 1, actualCheckIn: at(subDays(today, 42), 10, 30), typeId: "training", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "CHECKED_IN" }),
  toVisit({ id: "v-p214", firstName: "Naciye", lastName: "Solak", email: "naciye.solak@example.com", company: "Anka Nakliyat", day: subDays(today, 43), startHour: 11, startMinute: 30, durationHours: 1, actualCheckIn: at(subDays(today, 43), 11, 30), typeId: "meeting", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", status: "CHECKED_IN" }),
  toVisit({ id: "v-p215", firstName: "Onat", lastName: "Gürel", email: "onat.gurel@example.com", company: "Akın Tedarik A.Ş.", day: subDays(today, 45), startHour: 13, startMinute: 30, durationHours: 1, actualCheckIn: at(subDays(today, 45), 13, 30), typeId: "technical-service", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_IN" }),
  toVisit({ id: "v-p216", firstName: "Pınar", lastName: "Işıl", email: "pinar.isil@example.com", company: "Marmara Lojistik A.Ş.", day: subDays(today, 46), startHour: 14, startMinute: 30, durationHours: 1, actualCheckIn: at(subDays(today, 46), 14, 30), typeId: "audit", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "CHECKED_IN" }),
  toVisit({ id: "v-p217", firstName: "Rana", lastName: "Ekşi", email: "rana.eksi@example.com", company: "Vega Endüstri Ltd. Şti.", day: subDays(today, 48), startHour: 9, durationHours: 1, actualCheckIn: at(subDays(today, 48), 9, 0), typeId: "supplier", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "CHECKED_IN" }),
  toVisit({ id: "v-p218", firstName: "Serkan", lastName: "Aybar", email: "serkan.aybar@example.com", company: "Akın Tedarik A.Ş.", day: subDays(today, 49), startHour: 10, durationHours: 1, actualCheckIn: at(subDays(today, 49), 10, 0), typeId: "customer", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", status: "CHECKED_IN" }),
  toVisit({ id: "v-p219", firstName: "Tuğba", lastName: "Erol", email: "tugba.erol@example.com", company: "Nova Elektronik", day: subDays(today, 30), startHour: 9, durationHours: 1, actualCheckIn: at(subDays(today, 30), 9, 12), typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_IN" }),
  toVisit({ id: "v-p220", firstName: "Uğur", lastName: "Balkan", email: "ugur.balkan@example.com", company: "Doğuş Mühendislik", day: subDays(today, 33), startHour: 10, durationHours: 1, actualCheckIn: at(subDays(today, 33), 10, 18), typeId: "technical-service", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "CHECKED_IN" }),
  toVisit({ id: "v-p221", firstName: "Vildan", lastName: "Özkan", email: "vildan.ozkan@example.com", company: "Silverline Teknoloji", day: subDays(today, 36), startHour: 11, durationHours: 1, actualCheckIn: at(subDays(today, 36), 11, 9), typeId: "audit", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "CHECKED_IN" }),
  toVisit({ id: "v-p222", firstName: "Yakup", lastName: "Sancar", email: "yakup.sancar@example.com", company: "Global Parça Tedarik", day: subDays(today, 39), startHour: 13, durationHours: 1, actualCheckIn: at(subDays(today, 39), 13, 22), typeId: "supplier", employeeId: "kerem-demir", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", status: "CHECKED_IN" }),
  toVisit({ id: "v-p223", firstName: "Zerrin", lastName: "Konak", email: "zerrin.konak@example.com", company: "Bereket Gıda San. Tic.", day: subDays(today, 40), startHour: 9, durationHours: 1, typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "PLANNED" }),
  toVisit({ id: "v-p224", firstName: "Adnan", lastName: "Filiz", email: "adnan.filiz@example.com", company: "Ege Kimya Sanayi", day: subDays(today, 51), startHour: 10, durationHours: 1, typeId: "interview", employeeId: "emre-yilmaz", companyId: "bplas", facilityId: "bplas-arge", status: "NO_SHOW" }),
  toVisit({ id: "v-p225", firstName: "Belgin", lastName: "Tanış", email: "belgin.tanis@example.com", company: "Yıldız Kalıp ve Makine", day: subDays(today, 52), startHour: 11, durationHours: 1, typeId: "training", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "CANCELLED", note: "Ziyaretçi ertelenme talep etti" }),
  // --- Lifecycle demo seed rows -------------------------------------------
  // LC-1: Active, started, not yet overtime  → lifecycle actions visible
  toVisit({ id: "v-lc1", creatorEmployeeId: "maya-kara", firstName: "Emir", lastName: "Toprak", email: "emir.toprak@example.com", company: "Doğuş Mühendislik", day: today, startHour: 8, startMinute: 0, durationHours: 10, actualCheckIn: at(today, 8, 3), typeId: "meeting", employeeId: "atahan-bora-bozkurt", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_IN" }),
  // LC-2: Active, overtime  → lifecycle actions visible + overtime label
  toVisit({ id: "v-lc2", creatorEmployeeId: "maya-kara", firstName: "Fikret", lastName: "Uzun", email: "fikret.uzun@example.com", company: "Akın Tedarik A.Ş.", day: subDays(today, 0), startHour: 0, startMinute: 0, durationHours: 1, actualCheckIn: at(today, 0, 5), typeId: "audit", employeeId: "atahan-bora-bozkurt", companyId: "bplas", facilityId: "bplas-arge", status: "CHECKED_IN", note: "Bitiş saati geçmiş toplantı demo" }),
  // LC-3: Closed manually  → read-only, shows variance (early)
  toVisit({ id: "v-lc3", firstName: "Gonca", lastName: "Demir", email: "gonca.demir@example.com", company: "Vega Endüstri Ltd. Şti.", day: subDays(today, 0), startHour: 7, startMinute: 0, durationHours: 2, actualCheckIn: at(today, 7, 2), actualCheckOut: at(today, 8, 30), visitorCardReturned: true, typeId: "meeting", employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", status: "CHECKED_OUT", actualMeetingEnd: at(today, 8, 30), meetingEndSource: "MANUAL" }),
  // LC-4: Closed by last visitor checkout  → read-only, shows auto-close source
  toVisit({ id: "v-lc4", firstName: "Hande", lastName: "Kara", email: "hande.kara@example.com", company: "Marmara Lojistik A.Ş.", day: subDays(today, 1), startHour: 14, startMinute: 0, durationHours: 1, actualCheckIn: at(subDays(today, 1), 14, 5), actualCheckOut: at(subDays(today, 1), 15, 22), visitorCardReturned: true, typeId: "customer", employeeId: "selin-aydin", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "CHECKED_OUT", actualMeetingEnd: at(subDays(today, 1), 15, 22), meetingEndSource: "VISITOR_CHECK_OUT" }),
]

export const initialMockMeetings = initialMockMeetingVisits.map(({ meeting }) => meeting)
export const initialMockVisitRecords = initialMockMeetingVisits.map(({ visit }) => visit)
