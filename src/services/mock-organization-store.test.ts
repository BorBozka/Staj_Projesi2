import { describe, expect, it } from "vitest"

import { MockAdminService } from "@/services/mock-admin-service"
import { MockOrganizationStore } from "@/services/mock-organization-store"
import { MockVisitService } from "@/services/mock-visit-service"

function createServices() {
  const organizationStore = new MockOrganizationStore()
  return {
    admin: new MockAdminService(organizationStore),
    visits: new MockVisitService(undefined, organizationStore),
  }
}

describe("canonical mock organization store", () => {
  it("shares the established company and facility IDs between Admin and Visit", async () => {
    const { admin, visits } = createServices()
    const [organization, referenceData] = await Promise.all([admin.getOrganization(), visits.getReferenceData()])

    expect(referenceData.companies.map((company) => company.id)).toEqual(organization.companies.map((company) => company.id))
    expect(referenceData.facilities.map((facility) => facility.id)).toEqual(organization.facilities.map((facility) => facility.id))
    expect(referenceData.facilities.find((facility) => facility.id === "bplas-merkez")).toMatchObject({ companyId: "bplas" })
  })

  it("projects an Admin organization rename into freshly loaded Visit reference data", async () => {
    const { admin, visits } = createServices()
    await admin.saveOrganizationEntity("COMPANY", { id: "bplas", name: "BPLAS Güncel A.Ş.", active: true })

    expect((await visits.getReferenceData()).companies.find((company) => company.id === "bplas")?.name).toBe("BPLAS Güncel A.Ş.")
  })

  it("keeps employee departments as canonical department IDs with a resolved display label", async () => {
    const { admin, visits } = createServices()
    await admin.saveOrganizationEntity("DEPARTMENT", { id: "department-bplas-satin-alma", parentId: "bplas", name: "Stratejik Satın Alma", active: true })

    expect((await visits.getReferenceData()).employees.find((employee) => employee.id === "maya-kara")).toMatchObject({
      departmentId: "department-bplas-satin-alma",
      department: "Stratejik Satın Alma",
    })
  })

  it("rejects duplicate company names with trim and case normalization", async () => {
    const { admin } = createServices()
    await expect(admin.saveOrganizationEntity("COMPANY", { name: "  bplas a.ş.  ", active: true })).rejects.toThrow("aynı ada")
  })

  it("rejects duplicate facilities in one company but permits the same name in another", async () => {
    const { admin } = createServices()
    await expect(admin.saveOrganizationEntity("FACILITY", { parentId: "bplas", name: " merkez tesis ", active: true })).rejects.toThrow("aynı ada")
    await expect(admin.saveOrganizationEntity("FACILITY", { parentId: "anadolu-lojistik", name: "Merkez Tesis", active: true })).resolves.toMatchObject({ parentId: "anadolu-lojistik" })
  })

  it("rejects duplicate department and security-gate names in their parent scopes", async () => {
    const { admin } = createServices()
    await expect(admin.saveOrganizationEntity("DEPARTMENT", { parentId: "bplas", name: "satın alma", active: true })).rejects.toThrow("aynı ada")
    await expect(admin.saveOrganizationEntity("SECURITY_GATE", { parentId: "bplas-merkez", name: "ANA GİRİŞ", active: true })).rejects.toThrow("aynı ada")
  })

  it("rejects invalid parents and active children below passive parents", async () => {
    const { admin } = createServices()
    await expect(admin.saveOrganizationEntity("FACILITY", { parentId: "missing-company", name: "Geçersiz", active: true })).rejects.toThrow("Üst organizasyon")
    const passiveCompany = await admin.saveOrganizationEntity("COMPANY", { name: "Pasif Şirket", active: false })
    await expect(admin.saveOrganizationEntity("FACILITY", { parentId: passiveCompany.id, name: "Yeni Tesis", active: true })).rejects.toThrow("Pasif üst organizasyon")
    const passiveFacility = await admin.saveOrganizationEntity("FACILITY", { parentId: passiveCompany.id, name: "Pasif Tesis", active: false })
    await expect(admin.saveOrganizationEntity("FACILITY", { ...passiveFacility, active: true })).rejects.toThrow("Pasif üst organizasyon")
  })

  it("blocks parent deactivation without cascading child lifecycle changes", async () => {
    const { admin } = createServices()
    await expect(admin.saveOrganizationEntity("COMPANY", { id: "bplas", name: "BPLAS A.Ş.", active: false })).rejects.toThrow("Aktif alt kayıtları")
    await expect(admin.saveOrganizationEntity("FACILITY", { id: "bplas-merkez", parentId: "bplas", name: "Merkez Tesis", active: false })).rejects.toThrow("Aktif alt kayıtları")

    const organization = await admin.getOrganization()
    expect(organization.facilities.find((facility) => facility.id === "bplas-merkez")?.active).toBe(true)
    expect(organization.securityGates.find((gate) => gate.parentId === "bplas-merkez")?.active).toBe(true)
  })

  it("rejects an existing child entity parent change", async () => {
    const { admin } = createServices()
    await expect(admin.saveOrganizationEntity("FACILITY", {
      id: "bplas-merkez",
      parentId: "bplas-otomotiv",
      name: "Merkez Tesis",
      active: true,
    })).rejects.toThrow("üst ilişkisi değiştirilemez")
  })

  it("keeps historical visit projections readable after the organization refactor", async () => {
    const { visits } = createServices()
    const historicalVisit = (await visits.listVisits()).find((visit) => visit.id === "v-today-completed")

    expect(historicalVisit).toMatchObject({
      hostCompanyId: "bplas",
      facilityId: "bplas-arge",
      hostCompanyName: "BPLAS A.Ş.",
      facilityName: "Ar-Ge Merkezi",
    })
  })

  it("keeps Admin Users company scopes on canonical company IDs", async () => {
    const { admin } = createServices()
    const users = await admin.getUsers()
    expect(users.every((user) => user.authorizationScope.companyIds.every((id) => ["bplas", "bplas-otomotiv", "anadolu-lojistik"].includes(id)))).toBe(true)
  })
})
