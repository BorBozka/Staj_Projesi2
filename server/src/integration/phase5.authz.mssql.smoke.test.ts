import "dotenv/config"

import { PrismaClient } from "@prisma/client"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildApp } from "../app.js"
import { loadConfig } from "../config/env.js"
import type { EmailMessage, EmailSender } from "../delivery/email-sender.js"
import { PrismaAdminRepository } from "../repositories/prisma-admin-repository.js"
import { PrismaAuthRepository } from "../repositories/prisma-auth-repository.js"
import { PrismaGoodsMovementRepository } from "../repositories/goods-movement-repository.js"
import { PrismaOrganizationRepository } from "../repositories/prisma-organization-repository.js"
import { PrismaReportsRepository } from "../repositories/reports-repository.js"
import { PrismaResourceAssignmentRepository } from "../repositories/resource-assignment-repository.js"
import { PrismaResourceRepository } from "../repositories/prisma-resource-repository.js"
import { PrismaSettingsRepository } from "../repositories/prisma-settings-repository.js"
import { PrismaTransportAssignmentRepository } from "../repositories/transport-assignment-repository.js"
import { PrismaVisitorOperationsRepository } from "../repositories/visitor-operations-repository.js"

const describeMssql = process.env.RUN_MSSQL_INTEGRATION === "true" ? describe : describe.skip

/**
 * Phase 5 §12 authorization matrix against MSSQL. Uses the two-company demo seed:
 * `bplas` (primary — calisan / calisan2 / yonetici / guvenlik / admin) vs
 * `bplas-otomotiv` (yonetici2, MANAGER, isolated scope).
 */
describeMssql.sequential("Phase 5 MSSQL smoke — server-side authorization and scope", () => {
  const prisma = new PrismaClient()
  const testStartedAt = new Date()
  const suffix = Date.now().toString().slice(-9)

  const meetingIds: string[] = []
  const visitIds: string[] = []
  const visitorIds: string[] = []
  const goodsIds: string[] = []

  const sentEmails: EmailMessage[] = []
  const fakeEmailSender: EmailSender = { send: async (message) => { sentEmails.push(message) } }
  let app: FastifyInstance
  const cookies: Record<string, string> = {}
  const headers = (who: string) => ({ cookie: cookies[who] })
  const iso = (offsetMinutes: number) => new Date(testStartedAt.getTime() + offsetMinutes * 60_000).toISOString()

  const login = async (username: string, password: string) => {
    const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username, password } })
    expect(response.statusCode).toBe(200)
    const setCookie = response.headers["set-cookie"]
    return (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";", 1)[0] ?? ""
  }

  const createMeetingAs = async (who: string, hostEmployeeName: string, hostCompanyId: string, facilityId: string) => {
    const response = await app.inject({
      method: "POST",
      url: "/api/meetings",
      headers: headers(who),
      payload: {
        visitors: [{ firstName: "P5", lastName: `Ziyaretçi ${suffix}-${meetingIds.length}`, email: `p5-${suffix}-${meetingIds.length}@example.test`, company: "Acme" }],
        visitTypeId: "meeting",
        hostEmployeeName,
        hostCompanyId,
        facilityId,
        plannedStart: iso(60),
        plannedEnd: iso(120),
      },
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    meetingIds.push(body.meeting.id)
    visitIds.push(...body.visits.map((visit: { id: string }) => visit.id))
    visitorIds.push(...body.visits.map((visit: { visitor: { id: string } }) => visit.visitor.id))
    return { meetingId: body.meeting.id as string, visitId: body.visits[0].id as string }
  }

  beforeAll(async () => {
    const config = loadConfig()
    const resourceAssignmentRepository = new PrismaResourceAssignmentRepository(prisma)
    app = await buildApp(config, {
      authRepository: new PrismaAuthRepository(prisma),
      organizationRepository: new PrismaOrganizationRepository(prisma),
      adminRepository: new PrismaAdminRepository(prisma),
      settingsRepository: new PrismaSettingsRepository(prisma),
      resourceRepository: new PrismaResourceRepository(prisma),
      visitorOperationsRepository: new PrismaVisitorOperationsRepository(prisma, resourceAssignmentRepository),
      goodsMovementRepository: new PrismaGoodsMovementRepository(prisma),
      resourceAssignmentRepository,
      transportAssignmentRepository: new PrismaTransportAssignmentRepository(prisma),
      reportsRepository: new PrismaReportsRepository(prisma),
      emailSender: fakeEmailSender,
      checkDatabase: async () => { await prisma.$queryRawUnsafe("SELECT 1") },
    })
    cookies.admin = await login("admin", "admin")
    cookies.manager = await login("yonetici", "yonetici")
    cookies.security = await login("guvenlik", "guvenlik")
    cookies.employee = await login("calisan", "calisan")
    cookies.employee2 = await login("calisan2", "calisan2")
    cookies.otherManager = await login("yonetici2", "yonetici2")
  })

  afterAll(async () => {
    if (goodsIds.length > 0) await prisma.goodsMovement.deleteMany({ where: { id: { in: goodsIds } } })
    if (meetingIds.length > 0) {
      // updateMeeting adds a visit when a visitor row omits visitId; sweep every visit of the
      // touched meetings so the meeting rows can be removed regardless.
      const meetingVisits = await prisma.visit.findMany({ where: { meetingId: { in: meetingIds } }, select: { id: true, visitorId: true } })
      const sweepVisitIds = meetingVisits.map((visit) => visit.id)
      const sweepVisitorIds = [...new Set([...visitorIds, ...meetingVisits.map((visit) => visit.visitorId)])]
      await prisma.invitation.deleteMany({ where: { visitId: { in: sweepVisitIds } } })
      await prisma.visitRuleAcceptance.deleteMany({ where: { visitId: { in: sweepVisitIds } } })
      await prisma.visit.deleteMany({ where: { id: { in: sweepVisitIds } } })
      await prisma.meeting.deleteMany({ where: { id: { in: meetingIds } } })
      await prisma.visitor.deleteMany({ where: { id: { in: sweepVisitorIds } } })
    }
    for (const userId of [
      "current-admin-atahan-bozkurt", "current-manager-atahan-bozkurt", "current-security-atahan-bozkurt",
      "current-employee-maya-kara", "current-employee-deniz-ozdemir", "current-manager-otomotiv",
    ]) {
      await prisma.session.deleteMany({ where: { userId, createdAt: { gte: testStartedAt } } })
    }
    await app.close()
    await prisma.$disconnect()
  })

  it("EMPLOYEE cannot mutate another employee's visit; the owner and ADMIN can", async () => {
    const { meetingId, visitId } = await createMeetingAs("employee", "Maya Kara", "bplas", "bplas-merkez")
    const editPayload = {
      visitors: [{ visitId, firstName: "P5", lastName: `Ziyaretçi ${suffix}-0`, email: `p5-${suffix}-0@example.test`, company: "Acme Güncel" }],
      visitTypeId: "meeting", hostEmployeeName: "Maya Kara", hostCompanyId: "bplas", facilityId: "bplas-merkez",
      plannedStart: iso(60), plannedEnd: iso(120),
    }

    const otherEmployee = await app.inject({ method: "PATCH", url: `/api/meetings/${meetingId}`, headers: headers("employee2"), payload: editPayload })
    expect(otherEmployee.statusCode).toBe(403)
    expect(otherEmployee.json().error.code).toBe("VISIT_MUTATION_FORBIDDEN")

    const otherCancel = await app.inject({ method: "POST", url: `/api/visits/${visitId}/cancel`, headers: headers("employee2") })
    expect(otherCancel.statusCode).toBe(403)

    const owner = await app.inject({ method: "PATCH", url: `/api/meetings/${meetingId}`, headers: headers("employee"), payload: editPayload })
    expect(owner.statusCode).toBe(200)
    const adminEdit = await app.inject({ method: "PATCH", url: `/api/meetings/${meetingId}`, headers: headers("admin"), payload: editPayload })
    expect(adminEdit.statusCode).toBe(200)
  })

  it("MANAGER reads scoped visits but cannot mutate a visit it did not create", async () => {
    const { meetingId, visitId } = await createMeetingAs("employee", "Maya Kara", "bplas", "bplas-merkez")

    const list = await app.inject({ method: "GET", url: "/api/visits", headers: headers("manager") })
    expect(list.statusCode).toBe(200)
    expect(list.json().some((visit: { id: string }) => visit.id === visitId)).toBe(true)

    const managerEdit = await app.inject({
      method: "PATCH", url: `/api/meetings/${meetingId}`, headers: headers("manager"),
      payload: { visitors: [{ visitId, firstName: "P5", lastName: "Yeni", company: "Acme" }], visitTypeId: "meeting", hostEmployeeName: "Maya Kara", hostCompanyId: "bplas", facilityId: "bplas-merkez", plannedStart: iso(60), plannedEnd: iso(120) },
    })
    expect(managerEdit.statusCode).toBe(403)
    expect(managerEdit.json().error.code).toBe("VISIT_MUTATION_FORBIDDEN")
  })

  it("SECURITY has no access to reports, admin, or planning routes", async () => {
    for (const url of ["/api/reports/visits", "/api/reports/fleet", "/api/reports/goods", "/api/admin/users", "/api/transport-assignments", "/api/resources"]) {
      const response = await app.inject({ method: "GET", url, headers: headers("security") })
      expect(response.statusCode, url).toBe(403)
    }
    const createMeeting = await app.inject({
      method: "POST", url: "/api/meetings", headers: headers("security"),
      payload: { visitors: [{ firstName: "P5", lastName: "X", company: "Acme" }], visitTypeId: "meeting", hostEmployeeName: "Maya Kara", hostCompanyId: "bplas", facilityId: "bplas-merkez", plannedStart: iso(60), plannedEnd: iso(120) },
    })
    expect(createMeeting.statusCode).toBe(403)
  })

  it("SECURITY cannot create an operation outside its company/facility scope", async () => {
    const cards = await app.inject({ method: "GET", url: "/api/security/visitor-cards/available", headers: headers("security") })
    expect(cards.statusCode).toBe(200)
    const cardId = cards.json()[0]?.id
    expect(cardId).toBeTruthy()

    const outOfScope = await app.inject({
      method: "POST", url: "/api/security/unplanned-visits", headers: headers("security"),
      payload: { firstName: "P5", lastName: "Plansız", company: "Acme", hostEmployeeName: "Serbest", visitTypeId: "meeting", durationMinutes: 30, visitorCardId: cardId, rulesAccepted: true, companyId: "bplas-otomotiv", facilityId: "bplas-otomotiv-merkez" },
    })
    expect(outOfScope.statusCode).toBe(403)
    expect(outOfScope.json().error.code).toBe("OUT_OF_SCOPE")
  })

  it("reports 'all' never escapes the caller's authorization scope", async () => {
    // A primary-company visit exists; the secondary-company manager must not see it via `all`.
    await createMeetingAs("employee", "Maya Kara", "bplas", "bplas-merkez")

    const report = await app.inject({ method: "GET", url: "/api/reports/visits?companyId=all&facilityId=all", headers: headers("otherManager") })
    expect(report.statusCode).toBe(200)
    const companies = new Set(report.json().visits.map((visit: { meeting: { hostCompanyId: string } }) => visit.meeting.hostCompanyId))
    expect(companies.has("bplas")).toBe(false)
    for (const companyId of companies) expect(companyId).toBe("bplas-otomotiv")

    const referenceData = await app.inject({ method: "GET", url: "/api/visits/reference-data", headers: headers("otherManager") })
    expect(referenceData.json().companies.map((company: { id: string }) => company.id)).toEqual(["bplas-otomotiv"])
  })

  it("cross-scope entity reads are hidden as 404 and cross-scope mutations are rejected", async () => {
    const { meetingId } = await createMeetingAs("employee", "Maya Kara", "bplas", "bplas-merkez")

    const hiddenRead = await app.inject({ method: "GET", url: `/api/meetings/${meetingId}`, headers: headers("otherManager") })
    expect(hiddenRead.statusCode).toBe(404)

    const crossScopeGoods = await app.inject({
      method: "POST", url: "/api/goods-movements", headers: headers("otherManager"),
      payload: { direction: "INBOUND", companyId: "bplas", facilityId: "bplas-merkez", counterpartyName: "Tedarik", plannedDate: "2026-09-10", goodsDescription: "Palet", },
    })
    expect(crossScopeGoods.statusCode).toBe(403)
    expect(crossScopeGoods.json().error.code).toBe("OUT_OF_SCOPE")

    // A goods movement the secondary manager legitimately owns is invisible to a primary manager.
    const own = await app.inject({
      method: "POST", url: "/api/goods-movements", headers: headers("otherManager"),
      payload: { direction: "INBOUND", companyId: "bplas-otomotiv", facilityId: "bplas-otomotiv-merkez", counterpartyName: "Tedarik", plannedDate: "2026-09-10", goodsDescription: "Palet" },
    })
    expect(own.statusCode).toBe(201)
    goodsIds.push(own.json().id)

    const primaryList = await app.inject({ method: "GET", url: "/api/goods-movements", headers: headers("manager") })
    expect(primaryList.json().some((movement: { id: string }) => movement.id === own.json().id)).toBe(false)
  })
})
