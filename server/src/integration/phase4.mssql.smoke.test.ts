import "dotenv/config"

import { PrismaClient } from "@prisma/client"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildApp } from "../app.js"
import { loadConfig } from "../config/env.js"
import type { EmailMessage, EmailSender } from "../delivery/email-sender.js"
import { PrismaAdminRepository } from "../repositories/prisma-admin-repository.js"
import { PrismaAuthRepository } from "../repositories/prisma-auth-repository.js"
import { PrismaOrganizationRepository } from "../repositories/prisma-organization-repository.js"
import { PrismaResourceRepository } from "../repositories/prisma-resource-repository.js"
import { PrismaResourceAssignmentRepository } from "../repositories/resource-assignment-repository.js"
import { PrismaSettingsRepository } from "../repositories/prisma-settings-repository.js"
import { PrismaVisitorOperationsRepository } from "../repositories/visitor-operations-repository.js"
import { PrismaGoodsMovementRepository } from "../repositories/goods-movement-repository.js"
import { PrismaTransportAssignmentRepository } from "../repositories/transport-assignment-repository.js"
import { PrismaReportsRepository } from "../repositories/reports-repository.js"

const describeMssql = process.env.RUN_MSSQL_INTEGRATION === "true" ? describe : describe.skip

describeMssql.sequential("Phase 4 MSSQL smoke — goods, resource assignments, transport, reports", () => {
  const prisma = new PrismaClient()
  const testStartedAt = new Date()
  const suffix = Date.now().toString().slice(-9)

  const resourceIds: string[] = []
  const meetingIds: string[] = []
  const visitIds: string[] = []
  const visitorIds: string[] = []
  const goodsIds: string[] = []
  const transportIds: string[] = []

  const sentEmails: EmailMessage[] = []
  const fakeEmailSender: EmailSender = { send: async (message) => { sentEmails.push(message) } }
  let app: FastifyInstance
  const cookies: Record<string, string> = {}

  const login = async (username: string, password: string) => {
    const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username, password } })
    expect(response.statusCode).toBe(200)
    const setCookie = response.headers["set-cookie"]
    return (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";", 1)[0] ?? ""
  }
  const headers = (role: keyof typeof cookies) => ({ cookie: cookies[role] })

  const todayKey = `${testStartedAt.getFullYear()}-${String(testStartedAt.getMonth() + 1).padStart(2, "0")}-${String(testStartedAt.getDate()).padStart(2, "0")}`
  const iso = (offsetMinutesFromNow: number) => new Date(testStartedAt.getTime() + offsetMinutesFromNow * 60_000).toISOString()

  const createResource = async (payload: Record<string, unknown>) => {
    const response = await app.inject({ method: "POST", url: "/api/resources", headers: headers("admin"), payload })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    resourceIds.push(body.id)
    return body.id as string
  }

  const createMeeting = async (plannedStart: string, plannedEnd: string) => {
    const response = await app.inject({
      method: "POST",
      url: "/api/meetings",
      headers: headers("employee"),
      payload: {
        visitors: [{ firstName: "P4", lastName: `Ziyaretçi ${suffix}`, email: `p4-${suffix}-${meetingIds.length}@example.test`, company: "Acme" }],
        visitTypeId: "meeting",
        hostEmployeeId: "maya-kara",
        hostEmployeeName: "Maya Kara",
        hostCompanyId: "bplas",
        facilityId: "bplas-merkez",
        plannedStart,
        plannedEnd,
      },
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    meetingIds.push(body.meeting.id)
    visitIds.push(...body.visits.map((visit: { id: string }) => visit.id))
    visitorIds.push(...body.visits.map((visit: { visitor: { id: string } }) => visit.visitor.id))
    return body.meeting.id as string
  }

  let roomA = ""
  let roomB = ""
  let equipPool = ""
  let vehicle1 = ""
  let vehicle2 = ""
  let driver1 = ""
  let driver2 = ""

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

    roomA = await createResource({ type: "ROOM", companyId: "bplas", facilityId: "bplas-merkez", name: `P4 Oda A ${suffix}` })
    roomB = await createResource({ type: "ROOM", companyId: "bplas", facilityId: "bplas-merkez", name: `P4 Oda B ${suffix}` })
    equipPool = await createResource({ type: "POOLED_EQUIPMENT", companyId: "bplas", facilityId: "bplas-merkez", name: `P4 Projektör ${suffix}`, totalQuantity: 4 })
    vehicle1 = await createResource({ type: "VEHICLE", companyId: "bplas", facilityId: "bplas-merkez", brand: "Ford", model: "Transit", licensePlate: `34 P4A ${suffix}` })
    vehicle2 = await createResource({ type: "VEHICLE", companyId: "bplas", facilityId: "bplas-merkez", brand: "Fiat", model: "Doblo", licensePlate: `34 P4B ${suffix}` })
    driver1 = await createResource({ type: "DRIVER", companyId: "bplas", facilityId: "bplas-merkez", fullName: `P4 Şoför Bir ${suffix}`, licenseClasses: ["B"], documents: [], canDriveCommercialVehicles: false })
    driver2 = await createResource({ type: "DRIVER", companyId: "bplas", facilityId: "bplas-merkez", fullName: `P4 Şoför İki ${suffix}`, licenseClasses: ["B"], documents: [], canDriveCommercialVehicles: false })
  })

  afterAll(async () => {
    if (meetingIds.length > 0) await prisma.resourceAssignment.deleteMany({ where: { meetingId: { in: meetingIds } } })
    if (transportIds.length > 0) await prisma.transportAssignment.deleteMany({ where: { id: { in: transportIds } } })
    if (goodsIds.length > 0) await prisma.goodsMovement.deleteMany({ where: { id: { in: goodsIds } } })
    if (visitIds.length > 0) await prisma.visit.deleteMany({ where: { id: { in: visitIds } } })
    if (meetingIds.length > 0) await prisma.meeting.deleteMany({ where: { id: { in: meetingIds } } })
    if (visitorIds.length > 0) await prisma.visitor.deleteMany({ where: { id: { in: visitorIds } } })
    if (resourceIds.length > 0) {
      await prisma.driverLicenseClass.deleteMany({ where: { resourceId: { in: resourceIds } } })
      await prisma.driverDocument.deleteMany({ where: { resourceId: { in: resourceIds } } })
      await prisma.resource.deleteMany({ where: { id: { in: resourceIds } } })
    }
    for (const userId of ["current-admin-atahan-bozkurt", "current-manager-atahan-bozkurt", "current-security-atahan-bozkurt", "current-employee-maya-kara"]) {
      await prisma.session.deleteMany({ where: { userId, createdAt: { gte: testStartedAt } } })
    }
    await app.close()
    await prisma.$disconnect()
  })

  it("1-2: goods create → update → Security complete, and a second record cancel (soft delete)", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/goods-movements",
      headers: headers("manager"),
      payload: { direction: "INBOUND", companyId: "bplas", facilityId: "bplas-merkez", counterpartyName: `P4 Tedarik ${suffix}`, plannedDate: todayKey, plannedTime: "09:30", goodsDescription: "Ham madde paleti", referenceNumber: `IRS-${suffix}` },
    })
    expect(created.statusCode).toBe(201)
    const movement = created.json()
    goodsIds.push(movement.id)
    expect(movement).toMatchObject({ status: "PLANNED", companyName: "BPLAS A.Ş.", facilityName: "Merkez Tesis" })

    const updated = await app.inject({
      method: "PATCH",
      url: `/api/goods-movements/${movement.id}`,
      headers: headers("manager"),
      payload: { direction: "INBOUND", companyId: "bplas", facilityId: "bplas-merkez", counterpartyName: `P4 Tedarik ${suffix}`, plannedDate: todayKey, plannedTime: "10:15", goodsDescription: "Güncellenen palet", referenceNumber: `IRS-${suffix}` },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json()).toMatchObject({ plannedTime: "10:15", goodsDescription: "Güncellenen palet" })

    const operational = await app.inject({ method: "GET", url: "/api/security/goods-movements", headers: headers("security") })
    expect(operational.statusCode).toBe(200)
    expect(operational.json().map((item: { id: string }) => item.id)).toContain(movement.id)

    const completed = await app.inject({
      method: "POST",
      url: `/api/security/goods-movements/${movement.id}/complete`,
      headers: headers("security"),
      payload: { companyId: "bplas", facilityId: "bplas-merkez", actualPlate: "34 P4 999", actualDriverName: "Sürücü" },
    })
    expect(completed.statusCode).toBe(200)
    expect(completed.json()).toMatchObject({ status: "COMPLETED", actualPlate: "34 P4 999", actualDriverName: "Sürücü" })
    expect(completed.json().actualAt).toBeTruthy()

    const second = await app.inject({
      method: "POST",
      url: "/api/goods-movements",
      headers: headers("manager"),
      payload: { direction: "OUTBOUND", companyId: "bplas", facilityId: "bplas-merkez", counterpartyName: `P4 Alıcı ${suffix}`, plannedDate: todayKey, goodsDescription: "Sevkiyat" },
    })
    expect(second.statusCode).toBe(201)
    goodsIds.push(second.json().id)
    const cancelled = await app.inject({ method: "POST", url: `/api/goods-movements/${second.json().id}/cancel`, headers: headers("manager") })
    expect(cancelled.statusCode).toBe(200)
    expect(cancelled.json().status).toBe("CANCELLED")
    expect(await prisma.goodsMovement.findUnique({ where: { id: second.json().id } })).not.toBeNull()

    const rejected = await app.inject({ method: "POST", url: `/api/goods-movements/${second.json().id}/cancel`, headers: headers("manager") })
    expect(rejected.statusCode).toBe(409)
  })

  it("rejects Security completion outside the authenticated scope", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/goods-movements",
      headers: headers("manager"),
      payload: { direction: "INBOUND", companyId: "bplas", facilityId: "bplas-merkez", counterpartyName: `P4 Scope ${suffix}`, plannedDate: todayKey, goodsDescription: "Kapsam testi" },
    })
    goodsIds.push(created.json().id)
    const response = await app.inject({
      method: "POST",
      url: `/api/security/goods-movements/${created.json().id}/complete`,
      headers: headers("security"),
      payload: { companyId: "bplas", facilityId: "another-facility" },
    })
    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe("GOODS_MOVEMENT_OUT_OF_SCOPE")
  })

  it("3-6: Meeting room assignment, overlapping room conflict, pooled capacity, atomic replace failure", async () => {
    const meetingA = await createMeeting(iso(24 * 60), iso(25 * 60))
    const meetingB = await createMeeting(iso(24 * 60 + 30), iso(25 * 60 + 30))

    const roomAssigned = await app.inject({ method: "POST", url: `/api/meetings/${meetingA}/resource-assignments/room`, headers: headers("manager"), payload: { resourceId: roomA } })
    expect(roomAssigned.statusCode).toBe(201)
    expect(roomAssigned.json()).toMatchObject({ resourceType: "ROOM", resourceId: roomA })

    const listed = await app.inject({ method: "GET", url: `/api/meetings/${meetingA}/resource-assignments`, headers: headers("manager") })
    expect(listed.json().map((item: { resourceId: string }) => item.resourceId)).toEqual([roomA])

    const roomConflict = await app.inject({ method: "POST", url: `/api/meetings/${meetingB}/resource-assignments/room`, headers: headers("manager"), payload: { resourceId: roomA } })
    expect(roomConflict.statusCode).toBe(409)
    expect(roomConflict.json().error.code).toBe("ROOM_CONFLICT")
    expect((await app.inject({ method: "GET", url: `/api/meetings/${meetingB}/resource-assignments`, headers: headers("manager") })).json()).toHaveLength(0)

    const equipA = await app.inject({ method: "POST", url: `/api/meetings/${meetingA}/resource-assignments/equipment`, headers: headers("manager"), payload: { resourceId: equipPool, requestedQuantity: 3 } })
    expect(equipA.statusCode).toBe(201)
    const equipOver = await app.inject({ method: "POST", url: `/api/meetings/${meetingB}/resource-assignments/equipment`, headers: headers("manager"), payload: { resourceId: equipPool, requestedQuantity: 2 } })
    expect(equipOver.statusCode).toBe(409)
    expect(equipOver.json().error.code).toBe("EQUIPMENT_CAPACITY")
    const equipFits = await app.inject({ method: "POST", url: `/api/meetings/${meetingB}/resource-assignments/equipment`, headers: headers("manager"), payload: { resourceId: equipPool, requestedQuantity: 1 } })
    expect(equipFits.statusCode).toBe(201)

    const replaceFail = await app.inject({
      method: "PUT",
      url: `/api/meetings/${meetingA}/resource-assignments`,
      headers: headers("manager"),
      payload: { roomResourceId: roomA, equipment: [{ resourceId: equipPool, requestedQuantity: 4 }] },
    })
    expect(replaceFail.statusCode).toBe(409)
    const afterFail = (await app.inject({ method: "GET", url: `/api/meetings/${meetingA}/resource-assignments`, headers: headers("manager") })).json()
    expect(afterFail).toHaveLength(2)
    expect(afterFail.find((item: { resourceType: string }) => item.resourceType === "POOLED_EQUIPMENT").requestedQuantity).toBe(3)
  })

  it("7: Meeting extension is rejected when an existing room assignment would then collide", async () => {
    const meetingE = await createMeeting(iso(-180), iso(-60))
    const meetingF = await createMeeting(iso(-60), iso(60))
    expect((await app.inject({ method: "POST", url: `/api/meetings/${meetingE}/resource-assignments/room`, headers: headers("manager"), payload: { resourceId: roomB } })).statusCode).toBe(201)
    expect((await app.inject({ method: "POST", url: `/api/meetings/${meetingF}/resource-assignments/room`, headers: headers("manager"), payload: { resourceId: roomB } })).statusCode).toBe(201)

    const extend = await app.inject({ method: "POST", url: `/api/meetings/${meetingE}/extend`, headers: headers("employee"), payload: { extensionMinutes: 120 } })
    expect(extend.statusCode).toBe(409)
    expect(extend.json().error.code).toBe("ROOM_CONFLICT")

    const meeting = (await app.inject({ method: "GET", url: `/api/meetings/${meetingE}`, headers: headers("manager") })).json()
    expect(new Date(meeting.meeting.plannedEnd).getTime()).toBe(new Date(iso(-60)).getTime())
  })

  it("8-11: transport create, overlapping vehicle conflict, overlapping driver conflict, cancel", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/transport-assignments",
      headers: headers("manager"),
      payload: { companyId: "bplas", facilityId: "bplas-merkez", plannedStart: iso(48 * 60), plannedEnd: iso(49 * 60), purpose: "Saha ziyareti", vehicleResourceId: vehicle1, driverResourceId: driver1 },
    })
    expect(created.statusCode).toBe(201)
    transportIds.push(created.json().id)
    expect(created.json()).toMatchObject({ status: "ACTIVE", vehicleName: "Ford Transit", driverName: `P4 Şoför Bir ${suffix}` })

    const vehicleClash = await app.inject({
      method: "POST",
      url: "/api/transport-assignments",
      headers: headers("manager"),
      payload: { companyId: "bplas", facilityId: "bplas-merkez", plannedStart: iso(48 * 60 + 30), plannedEnd: iso(49 * 60 + 30), purpose: "Çakışan araç", vehicleResourceId: vehicle1, driverResourceId: driver2 },
    })
    expect(vehicleClash.statusCode).toBe(409)
    expect(vehicleClash.json().error.message).toContain("araç")

    const driverClash = await app.inject({
      method: "POST",
      url: "/api/transport-assignments",
      headers: headers("manager"),
      payload: { companyId: "bplas", facilityId: "bplas-merkez", plannedStart: iso(48 * 60 + 30), plannedEnd: iso(49 * 60 + 30), purpose: "Çakışan şoför", vehicleResourceId: vehicle2, driverResourceId: driver1 },
    })
    expect(driverClash.statusCode).toBe(409)
    expect(driverClash.json().error.message).toContain("şoför")

    const touching = await app.inject({
      method: "POST",
      url: "/api/transport-assignments",
      headers: headers("manager"),
      payload: { companyId: "bplas", facilityId: "bplas-merkez", plannedStart: iso(49 * 60), plannedEnd: iso(50 * 60), purpose: "Bitişik görev", vehicleResourceId: vehicle1, driverResourceId: driver1 },
    })
    expect(touching.statusCode).toBe(201)
    transportIds.push(touching.json().id)

    const cancelled = await app.inject({ method: "POST", url: `/api/transport-assignments/${created.json().id}/cancel`, headers: headers("manager") })
    expect(cancelled.statusCode).toBe(200)
    expect(cancelled.json().status).toBe("CANCELLED")
    expect((await app.inject({ method: "POST", url: `/api/transport-assignments/${created.json().id}/cancel`, headers: headers("manager") })).statusCode).toBe(409)
  })

  it("12: visits, fleet and goods report datasets return scoped raw records", async () => {
    const range = "?startDate=2025-01-01&endDate=2035-12-31&companyId=bplas&facilityId=bplas-merkez"
    const visits = await app.inject({ method: "GET", url: `/api/reports/visits${range}`, headers: headers("manager") })
    expect(visits.statusCode).toBe(200)
    expect(visits.json().visits.some((visit: { meetingId: string }) => meetingIds.includes(visit.meetingId))).toBe(true)

    const fleet = await app.inject({ method: "GET", url: `/api/reports/fleet${range}`, headers: headers("manager") })
    expect(fleet.statusCode).toBe(200)
    expect(fleet.json().assignments.some((item: { id: string }) => transportIds.includes(item.id))).toBe(true)

    const goods = await app.inject({ method: "GET", url: `/api/reports/goods?startDate=${todayKey}&endDate=${todayKey}&companyId=bplas`, headers: headers("manager") })
    expect(goods.statusCode).toBe(200)
    expect(goods.json().movements.some((item: { id: string }) => goodsIds.includes(item.id))).toBe(true)

    const forbidden = await app.inject({ method: "GET", url: `/api/reports/visits${range}`, headers: headers("security") })
    expect(forbidden.statusCode).toBe(403)
  })

  it("concurrency: overlapping room grabs and overlapping vehicle bookings never oversubscribe", async () => {
    const meetingR1 = await createMeeting(iso(72 * 60), iso(73 * 60))
    const meetingR2 = await createMeeting(iso(72 * 60 + 15), iso(73 * 60 + 15))
    const roomResponses = await Promise.all([
      app.inject({ method: "POST", url: `/api/meetings/${meetingR1}/resource-assignments/room`, headers: headers("manager"), payload: { resourceId: roomA } }),
      app.inject({ method: "POST", url: `/api/meetings/${meetingR2}/resource-assignments/room`, headers: headers("manager"), payload: { resourceId: roomA } }),
    ])
    expect(roomResponses.map((response) => response.statusCode).sort()).toEqual([201, 409])
    const loser = roomResponses.find((response) => response.statusCode === 409)!
    expect(["ROOM_CONFLICT", "RESOURCE_ASSIGNMENT_CONFLICT"]).toContain(loser.json().error.code)
    expect(JSON.stringify(loser.json())).not.toMatch(/P20\d\d|deadlock|serializ|SQL Server/i)
    const roomHolders = await prisma.resourceAssignment.count({ where: { resourceId: roomA, meetingId: { in: [meetingR1, meetingR2] } } })
    expect(roomHolders).toBe(1)

    const vehicleResponses = await Promise.all([
      app.inject({ method: "POST", url: "/api/transport-assignments", headers: headers("manager"), payload: { companyId: "bplas", facilityId: "bplas-merkez", plannedStart: iso(96 * 60), plannedEnd: iso(97 * 60), purpose: "Yarış A", vehicleResourceId: vehicle1, driverResourceId: driver1 } }),
      app.inject({ method: "POST", url: "/api/transport-assignments", headers: headers("manager"), payload: { companyId: "bplas", facilityId: "bplas-merkez", plannedStart: iso(96 * 60 + 15), plannedEnd: iso(97 * 60 + 15), purpose: "Yarış B", vehicleResourceId: vehicle1, driverResourceId: driver2 } }),
    ])
    for (const response of vehicleResponses) {
      if (response.statusCode === 201) transportIds.push(response.json().id)
    }
    expect(vehicleResponses.map((response) => response.statusCode).sort()).toEqual([201, 409])
    expect(JSON.stringify(vehicleResponses.find((response) => response.statusCode === 409)!.json())).not.toMatch(/P20\d\d|deadlock|serializ|SQL Server/i)
    const vehicleHolders = await prisma.transportAssignment.count({
      where: { vehicleResourceId: vehicle1, status: "ACTIVE", plannedStart: { lt: new Date(iso(97 * 60 + 15)) }, plannedEnd: { gt: new Date(iso(96 * 60)) } },
    })
    expect(vehicleHolders).toBe(1)
  })
})
