import { describe, expect, it } from "vitest"

import type { EmployeeOption } from "@/domain/visits"
import { filterHostEmployees } from "@/features/visits/host-employee-search"

function employee(overrides: Partial<EmployeeOption> = {}): EmployeeOption {
  return {
    id: "e-1",
    companyId: "bplas",
    facilityIds: ["bplas-merkez"],
    name: "İpek Işık",
    departmentId: "dept-1",
    department: "Satın Alma",
    ...overrides,
  }
}

const roster: EmployeeOption[] = [
  employee({ id: "ipek", name: "İpek Işık" }),
  employee({ id: "irmak", name: "Irmak Ilgaz" }),
  employee({ id: "canan", name: "Canan Şahin" }),
  employee({ id: "other-company", name: "Deniz Yıldız", companyId: "bplas-otomotiv", facilityIds: ["otomotiv-uretim"] }),
  employee({ id: "other-facility", name: "Kaya Demir", facilityIds: ["bplas-arge"] }),
]

const scope = { companyId: "bplas", facilityId: "bplas-merkez" }

describe("filterHostEmployees", () => {
  it("keeps only employees in the selected company and facility", () => {
    const result = filterHostEmployees(roster, { ...scope, query: "" })
    expect(result.map((e) => e.id)).toEqual(["ipek", "irmak", "canan"])
  })

  it("returns nothing until a company and facility are chosen", () => {
    expect(filterHostEmployees(roster, { companyId: "", facilityId: "", query: "" })).toEqual([])
  })

  it("matches Turkish characters with dotted/dotless I folding", () => {
    // "İpek Işık" folds to "ipek ışık"; "Irmak Ilgaz" folds to "ırmak ılgaz".
    expect(filterHostEmployees(roster, { ...scope, query: "ışık" }).map((e) => e.id)).toEqual(["ipek"])
    expect(filterHostEmployees(roster, { ...scope, query: "ılg" }).map((e) => e.id)).toEqual(["irmak"])
    expect(filterHostEmployees(roster, { ...scope, query: "IRM" }).map((e) => e.id)).toEqual(["irmak"])
  })

  it("ignores letter case", () => {
    expect(filterHostEmployees(roster, { ...scope, query: "CANAN" }).map((e) => e.id)).toEqual(["canan"])
    expect(filterHostEmployees(roster, { ...scope, query: "İPEK" }).map((e) => e.id)).toEqual(["ipek"])
  })

  it("matches on a partial fragment anywhere in the name", () => {
    expect(filterHostEmployees(roster, { ...scope, query: "şah" }).map((e) => e.id)).toEqual(["canan"])
  })

  it("returns an empty list when nothing matches", () => {
    expect(filterHostEmployees(roster, { ...scope, query: "zzz" })).toEqual([])
  })

  it("does not match an employee who is out of scope even if the name matches", () => {
    expect(filterHostEmployees(roster, { ...scope, query: "deniz" })).toEqual([])
    expect(filterHostEmployees(roster, { ...scope, query: "kaya" })).toEqual([])
  })
})
