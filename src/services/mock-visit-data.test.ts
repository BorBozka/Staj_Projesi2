import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import type { AuthorizationScope } from "@/domain/admin"
import type { SessionUser } from "@/services/session-service"
import { initialMockOrganizationSnapshot } from "@/services/mock-organization-store"
import { mockScenarioNow } from "@/services/mock-scenario"
import { initialMockVisitTypes } from "@/services/mock-visit-type-store"
import { createMockVisitReferenceData, initialMockMeetings, initialMockVisitRecords, toDemoVisitCurrentEmployee } from "@/services/mock-visit-data"

const source = readFileSync(resolve(process.cwd(), "src/services/mock-visit-data.ts"), "utf8")

const bplasMerkezScope: AuthorizationScope = { companyIds: ["bplas"], facilityIds: ["bplas-merkez"], securityGateIds: [] }

function sessionUser(overrides: Partial<SessionUser>): SessionUser {
  return {
    id: "session-1",
    username: "user",
    fullName: "User",
    initials: "U",
    role: "EMPLOYEE",
    roleLabel: "Çalışan",
    authenticationSource: "LOCAL",
    authorizationScope: bplasMerkezScope,
    employeeId: "maya-kara",
    ...overrides,
  }
}

function getMayaCreatedVisits() {
  const meetingsById = new Map(initialMockMeetings.map((meeting) => [meeting.id, meeting]))
  return initialMockVisitRecords.flatMap((visit) => {
    const meeting = meetingsById.get(visit.meetingId)
    return meeting?.creatorEmployeeId === "maya-kara" ? [{ visit, meeting }] : []
  })
}

describe("toDemoVisitCurrentEmployee", () => {
  it("projects the signed-in employee session onto the reference-data identity", () => {
    expect(toDemoVisitCurrentEmployee(sessionUser({ employeeId: "maya-kara", role: "EMPLOYEE" }))).toEqual({
      employeeId: "maya-kara",
      companyId: "bplas",
      facilityId: "bplas-merkez",
      role: "EMPLOYEE",
    })
  })

  it("reflects a different signed-in identity rather than a fixed employee", () => {
    expect(toDemoVisitCurrentEmployee(sessionUser({ employeeId: "eda-karaca", role: "MANAGER" }))).toEqual({
      employeeId: "eda-karaca",
      companyId: "bplas",
      facilityId: "bplas-merkez",
      role: "MANAGER",
    })
  })

  it("maps an employee-less Admin/Security session to the neutral MANAGER placeholder", () => {
    expect(toDemoVisitCurrentEmployee(sessionUser({ employeeId: null, role: "ADMIN" }))).toEqual({
      employeeId: "",
      companyId: "bplas",
      facilityId: "bplas-merkez",
      role: "MANAGER",
    })
  })

  it("throws instead of falling back to a fixed identity when signed out", () => {
    expect(() => toDemoVisitCurrentEmployee(null)).toThrow(/oturum açmış bir kullanıcı/)
  })
})

describe("createMockVisitReferenceData identity", () => {
  it("returns the identity it is given", () => {
    const identity = { employeeId: "maya-kara", companyId: "bplas", facilityId: "bplas-merkez", role: "EMPLOYEE" } as const
    expect(createMockVisitReferenceData(initialMockOrganizationSnapshot, initialMockVisitTypes, identity).currentEmployee).toEqual(identity)
  })

  it("throws when no identity is supplied instead of defaulting to eda-karaca", () => {
    expect(() => createMockVisitReferenceData(initialMockOrganizationSnapshot, initialMockVisitTypes)).toThrow(/currentEmployee/)
  })

  it("no longer hardcodes the current employee in the returned projection", () => {
    expect(source).not.toContain('currentEmployee: { employeeId: "eda-karaca"')
    expect(source).toContain("currentEmployee,")
  })
})

describe("Maya Kara demo visit seeds", () => {
  it("includes current-week scenarios for the employee My Visits screen", () => {
    const mayaVisits = getMayaCreatedVisits()
    const minutesUntil = (id: string) => (new Date(mayaVisits.find(({ visit }) => visit.id === id)!.meeting.plannedStart).getTime() - mockScenarioNow.getTime()) / 60_000

    expect(mayaVisits.length).toBeGreaterThan(0)
    expect(minutesUntil("v-maya-soon")).toBeGreaterThan(0)
    expect(minutesUntil("v-maya-soon")).toBeLessThan(120)
    expect(minutesUntil("v-maya-later")).toBeGreaterThan(120)
    expect(mayaVisits.some(({ visit, meeting }) => visit.id === "v-maya-different-facility" && meeting.facilityId !== "bplas-merkez")).toBe(true)
    expect(mayaVisits.some(({ visit }) => visit.id === "v-maya-cancelled" && visit.status === "CANCELLED")).toBe(true)
  })
})
