import { afterEach, describe, expect, it, vi } from "vitest"

import { HttpAccountService } from "@/services/http/http-account-service"
import { HttpAdminService } from "@/services/http/http-admin-service"
import { HttpGoodsMovementService } from "@/services/http/http-goods-movement-service"
import { HttpReportsService } from "@/services/http/http-reports-service"
import { HttpResourceAssignmentService } from "@/services/http/http-resource-assignment-service"
import { HttpResourceCatalogService } from "@/services/http/http-resource-catalog-service"
import { HttpSecurityService } from "@/services/http/http-security-service"
import { HttpSessionService } from "@/services/http/http-session-service"
import { HttpTransportAssignmentService } from "@/services/http/http-transport-assignment-service"
import { HttpVisitService } from "@/services/http/http-visit-service"
import { MockAccountService } from "@/services/mock-account-service"
import { MockAdminService } from "@/services/mock-admin-service"
import { MockGoodsMovementService } from "@/services/mock-goods-movement-service"
import { MockReportsService } from "@/services/mock-reports-service"
import { MockResourceAssignmentService } from "@/services/mock-resource-assignment-service"
import { MockResourceCatalogService } from "@/services/mock-resource-catalog-service"
import { MockSecurityService } from "@/services/mock-security-service"
import { MockSessionService } from "@/services/mock-session-service"
import { MockTransportAssignmentService } from "@/services/mock-transport-assignment-service"
import { MockVisitService } from "@/services/mock-visit-service"
import { createRuntimeServices, type RuntimeServices } from "@/services/runtime-services"

const serviceKeys = [
  "visitService",
  "resourceCatalogService",
  "resourceAssignmentService",
  "transportAssignmentService",
  "goodsMovementService",
  "adminService",
  "securityService",
  "accountService",
  "sessionService",
  "reportsService",
] satisfies (keyof RuntimeServices)[]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("runtime service composition", () => {
  it("instantiates every Http adapter in api mode", () => {
    const services = createRuntimeServices("api")

    expect(services.visitService).toBeInstanceOf(HttpVisitService)
    expect(services.resourceCatalogService).toBeInstanceOf(HttpResourceCatalogService)
    expect(services.resourceAssignmentService).toBeInstanceOf(HttpResourceAssignmentService)
    expect(services.transportAssignmentService).toBeInstanceOf(HttpTransportAssignmentService)
    expect(services.goodsMovementService).toBeInstanceOf(HttpGoodsMovementService)
    expect(services.adminService).toBeInstanceOf(HttpAdminService)
    expect(services.securityService).toBeInstanceOf(HttpSecurityService)
    expect(services.accountService).toBeInstanceOf(HttpAccountService)
    expect(services.sessionService).toBeInstanceOf(HttpSessionService)
    expect(services.reportsService).toBeInstanceOf(HttpReportsService)
  })

  it("instantiates every Mock adapter in demo mode without changing the runtime boundary", () => {
    const services: RuntimeServices = createRuntimeServices("demo")

    expect(Object.keys(services).sort()).toEqual([...serviceKeys].sort())
    expect(services.visitService).toBeInstanceOf(MockVisitService)
    expect(services.resourceCatalogService).toBeInstanceOf(MockResourceCatalogService)
    expect(services.resourceAssignmentService).toBeInstanceOf(MockResourceAssignmentService)
    expect(services.transportAssignmentService).toBeInstanceOf(MockTransportAssignmentService)
    expect(services.goodsMovementService).toBeInstanceOf(MockGoodsMovementService)
    expect(services.adminService).toBeInstanceOf(MockAdminService)
    expect(services.securityService).toBeInstanceOf(MockSecurityService)
    expect(services.accountService).toBeInstanceOf(MockAccountService)
    expect(services.sessionService).toBeInstanceOf(MockSessionService)
    expect(services.reportsService).toBeInstanceOf(MockReportsService)
  })

  it.each([
    ["calisan", "EMPLOYEE"],
    ["yonetici", "MANAGER"],
    ["admin", "ADMIN"],
    ["guvenlik", "SECURITY"],
  ] as const)("supports the %s demo login and browser session", async (username, role) => {
    const values = new Map<string, string>()
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    })
    const { sessionService } = createRuntimeServices("demo")

    const loggedIn = await sessionService.login(username, username)

    expect(loggedIn.role).toBe(role)
    await expect(sessionService.getCurrentSession()).resolves.toEqual(loggedIn)
  })

  it("shares demo data across dependent services", async () => {
    const services = createRuntimeServices("demo")
    const meetings = await services.visitService.listMeetings()

    const [visits, reportVisits] = await Promise.all([
      services.visitService.listVisits(),
      services.reportsService.getVisitsDataset({}),
    ])

    expect(reportVisits).toEqual(visits)
    await expect(
      services.resourceAssignmentService.listAssignmentsForMeeting(meetings[0].id),
    ).resolves.toBeDefined()
    await expect(services.securityService.getAvailableVisitorCards()).resolves.not.toHaveLength(0)
  })
})
