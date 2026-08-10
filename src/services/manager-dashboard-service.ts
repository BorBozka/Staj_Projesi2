import { addHours, addMinutes, startOfDay } from "date-fns"

import type { ExpectedAfterHoursDelivery } from "@/domain/manager-dashboard"

const clone = <T,>(value: T): T => structuredClone(value)

const today = startOfDay(new Date())
const expectedAfterHoursDeliveries: ExpectedAfterHoursDelivery[] = [
  { id: "delivery-099", supplierName: "Kuzey Ambalaj", companyId: "bplas", facilityId: "bplas-merkez", expectedAt: addHours(today, 9).toISOString(), status: "EXPECTED" },
  { id: "delivery-100", supplierName: "Ege Endüstri", companyId: "bplas", facilityId: "bplas-merkez", expectedAt: addHours(today, 10).toISOString(), status: "EXPECTED" },
  { id: "delivery-103", supplierName: "Mavi Kimya", companyId: "bplas", facilityId: "bplas-arge", expectedAt: addHours(today, 12).toISOString(), status: "EXPECTED" },
  { id: "delivery-104", supplierName: "Doruk Plastik", companyId: "bplas", facilityId: "bplas-merkez", expectedAt: addHours(today, 12).toISOString(), status: "EXPECTED" },
  { id: "delivery-105", supplierName: "Eksen Parça", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", expectedAt: addHours(today, 16).toISOString(), status: "EXPECTED" },
  { id: "delivery-106", supplierName: "Kent Nakliyat", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", expectedAt: addHours(today, 18).toISOString(), status: "EXPECTED" },
  { id: "delivery-101", supplierName: "Atlas Lojistik", companyId: "bplas", facilityId: "bplas-merkez", expectedAt: addHours(today, 19).toISOString(), status: "EXPECTED" },
  { id: "delivery-107", supplierName: "Öncü Metal", companyId: "bplas", facilityId: "bplas-arge", expectedAt: addHours(today, 19).toISOString(), status: "EXPECTED" },
  { id: "delivery-102", supplierName: "Marmara Tedarik", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", expectedAt: addHours(today, 21).toISOString(), status: "EXPECTED" },
  { id: "delivery-108", supplierName: "Gece Hat Lojistik", companyId: "bplas", facilityId: "bplas-merkez", expectedAt: addMinutes(addHours(today, 22), 15).toISOString(), status: "EXPECTED" },
  { id: "delivery-109", supplierName: "Vardiya Tedarik", companyId: "anadolu-lojistik", facilityId: "anadolu-lojistik-merkez", expectedAt: addMinutes(addHours(today, 23), 30).toISOString(), status: "EXPECTED" },
]

export interface ManagerDashboardService {
  listExpectedAfterHoursDeliveries(): Promise<ExpectedAfterHoursDelivery[]>
}

export class MockManagerDashboardService implements ManagerDashboardService {
  async listExpectedAfterHoursDeliveries(): Promise<ExpectedAfterHoursDelivery[]> {
    return clone(expectedAfterHoursDeliveries)
  }
}

export const managerDashboardService: ManagerDashboardService = new MockManagerDashboardService()
