import "dotenv/config"

import { PrismaClient } from "@prisma/client"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildApp } from "../app.js"
import { verifyPassword } from "../auth/password.js"
import { loadConfig } from "../config/env.js"
import { PrismaAdminRepository } from "../repositories/prisma-admin-repository.js"
import { PrismaAuthRepository } from "../repositories/prisma-auth-repository.js"
import { PrismaOrganizationRepository } from "../repositories/prisma-organization-repository.js"
import { PrismaResourceRepository } from "../repositories/prisma-resource-repository.js"
import { PrismaSettingsRepository } from "../repositories/prisma-settings-repository.js"
import { demoSeedUsers } from "../../prisma/seed-data.js"

const describeMssql = process.env.RUN_MSSQL_INTEGRATION === "true" ? describe : describe.skip

describeMssql.sequential("Phase 1-2 MSSQL smoke", () => {
  const prisma = new PrismaClient()
  const testStartedAt = new Date()
  const resourceIds: string[] = []
  let app: FastifyInstance
  let sessionCookie = ""
  let originalSettings: {
    overdueToleranceMinutes: number
    overdueAlertRepeatMinutes: number
    workdayEndTime: string
  } | null = null

  beforeAll(async () => {
    const config = loadConfig()
    app = await buildApp(config, {
      authRepository: new PrismaAuthRepository(prisma),
      organizationRepository: new PrismaOrganizationRepository(prisma),
      adminRepository: new PrismaAdminRepository(prisma),
      settingsRepository: new PrismaSettingsRepository(prisma),
      resourceRepository: new PrismaResourceRepository(prisma),
      checkDatabase: async () => { await prisma.$queryRawUnsafe("SELECT 1") },
    })
    const settings = await prisma.operationalSettings.findUnique({ where: { id: "default" } })
    if (settings) {
      originalSettings = {
        overdueToleranceMinutes: settings.overdueToleranceMinutes,
        overdueAlertRepeatMinutes: settings.overdueAlertRepeatMinutes,
        workdayEndTime: settings.workdayEndTime,
      }
    }
  })

  afterAll(async () => {
    if (resourceIds.length > 0) {
      await prisma.$transaction([
        prisma.driverLicenseClass.deleteMany({ where: { resourceId: { in: resourceIds } } }),
        prisma.driverDocument.deleteMany({ where: { resourceId: { in: resourceIds } } }),
        prisma.resource.deleteMany({ where: { id: { in: resourceIds } } }),
      ])
    }
    if (originalSettings) {
      await prisma.operationalSettings.update({ where: { id: "default" }, data: originalSettings })
    }
    await prisma.session.deleteMany({
      where: { userId: "current-admin-atahan-bozkurt", createdAt: { gte: testStartedAt } },
    })
    await app.close()
    await prisma.$disconnect()
  })

  it("has the expected idempotent development seed data", async () => {
    const [company, facility, department, gate, settings] = await Promise.all([
      prisma.company.findUnique({ where: { id: "bplas" } }),
      prisma.facility.findUnique({ where: { id: "bplas-merkez" } }),
      prisma.department.findUnique({ where: { id: "department-bplas-yonetim" } }),
      prisma.securityGate.findUnique({ where: { id: "gate-bplas-merkez-ana-giris" } }),
      prisma.operationalSettings.findUnique({ where: { id: "default" } }),
    ])

    expect(company).toMatchObject({ active: true })
    expect(facility).toMatchObject({ companyId: "bplas", active: true })
    expect(department).toMatchObject({ companyId: "bplas", active: true })
    expect(gate).toMatchObject({ facilityId: "bplas-merkez", active: true })
    expect(settings).toMatchObject({
      overdueToleranceMinutes: 15,
      overdueAlertRepeatMinutes: 10,
      workdayEndTime: "18:15",
    })

    for (const definition of demoSeedUsers) {
      const user = await prisma.user.findUnique({
        where: { id: definition.id },
        include: { companyScopes: true, facilityScopes: true, securityGateScopes: true },
      })
      expect(user).toMatchObject({
        username: definition.username,
        role: definition.role,
        authenticationSource: "LOCAL",
        active: true,
      })
      expect(user?.passwordHash).toBeTruthy()
      expect(await verifyPassword(user!.passwordHash!, definition.password)).toBe(true)
      expect(user?.companyScopes).toEqual([expect.objectContaining({ companyId: "bplas" })])
      expect(user?.facilityScopes).toEqual([expect.objectContaining({ facilityId: "bplas-merkez" })])
      expect(user?.securityGateScopes).toEqual([
        expect.objectContaining({ securityGateId: "gate-bplas-merkez-ana-giris" }),
      ])
    }
  })

  it("serves readiness, LOCAL login, and session hydration", async () => {
    const ready = await app.inject({ method: "GET", url: "/api/ready" })
    expect(ready.statusCode).toBe(200)
    expect(ready.json()).toEqual({ status: "ok" })

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "admin" },
    })
    expect(login.statusCode).toBe(200)
    expect(login.json()).toMatchObject({ user: { username: "admin", role: "ADMIN" } })
    const setCookie = login.headers["set-cookie"]
    const rawSetCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie
    sessionCookie = rawSetCookie?.split(";", 1)[0] ?? ""
    expect(sessionCookie).not.toBe("")

    const session = await app.inject({ method: "GET", url: "/api/auth/session", headers: { cookie: sessionCookie } })
    expect(session.statusCode).toBe(200)
    expect(session.json()).toMatchObject({ user: { username: "admin", role: "ADMIN" } })
  })

  it("reads organization, admin users, and operational settings and updates settings", async () => {
    const headers = { cookie: sessionCookie }
    const [organization, users, settings] = await Promise.all([
      app.inject({ method: "GET", url: "/api/organization", headers }),
      app.inject({ method: "GET", url: "/api/admin/users", headers }),
      app.inject({ method: "GET", url: "/api/settings/operational", headers }),
    ])

    expect(organization.statusCode).toBe(200)
    expect(organization.json()).toMatchObject({
      companies: [expect.objectContaining({ id: "bplas" })],
      facilities: [expect.objectContaining({ id: "bplas-merkez", parentId: "bplas" })],
      departments: [expect.objectContaining({ id: "department-bplas-yonetim", parentId: "bplas" })],
      securityGates: [expect.objectContaining({ id: "gate-bplas-merkez-ana-giris", parentId: "bplas-merkez" })],
    })
    expect(users.statusCode).toBe(200)
    expect(users.json()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "current-admin-atahan-bozkurt", role: "ADMIN" }),
    ]))
    expect(settings.statusCode).toBe(200)
    expect(settings.json()).toMatchObject(originalSettings!)

    const update = await app.inject({
      method: "PUT",
      url: "/api/settings/operational",
      headers,
      payload: { overdueToleranceMinutes: 17, overdueAlertRepeatMinutes: 11, workdayEndTime: "19:05" },
    })
    expect(update.statusCode).toBe(200)
    expect(update.json()).toMatchObject({
      overdueToleranceMinutes: 17,
      overdueAlertRepeatMinutes: 11,
      workdayEndTime: "19:05",
    })
    expect(await prisma.operationalSettings.findUnique({ where: { id: "default" } })).toMatchObject({
      overdueToleranceMinutes: 17,
      overdueAlertRepeatMinutes: 11,
      workdayEndTime: "19:05",
    })
  })

  it("creates and reads ROOM, VEHICLE, and DRIVER resources and replaces DRIVER relations", async () => {
    const headers = { cookie: sessionCookie }
    const suffix = Date.now().toString().slice(-8)
    const resources = [
      { type: "ROOM", companyId: "bplas", facilityId: "bplas-merkez", name: `MSSQL Oda ${suffix}` },
      { type: "VEHICLE", companyId: "bplas", facilityId: "bplas-merkez", brand: "Ford", model: "Focus", licensePlate: `16 DB ${suffix}` },
      { type: "DRIVER", companyId: "bplas", facilityId: "bplas-merkez", fullName: `MSSQL Şoför ${suffix}`, licenseClasses: ["B", "C"], documents: ["SRC 2"], canDriveCommercialVehicles: true },
    ] as const

    const created = []
    for (const payload of resources) {
      const response = await app.inject({ method: "POST", url: "/api/resources", headers, payload })
      expect(response.statusCode).toBe(201)
      const resource = response.json()
      resourceIds.push(resource.id)
      created.push(resource)

      const read = await app.inject({ method: "GET", url: `/api/resources/${resource.id}`, headers })
      expect(read.statusCode).toBe(200)
      expect(read.json()).toMatchObject({ id: resource.id, type: payload.type })
    }

    const driver = created.find((resource) => resource.type === "DRIVER")!
    expect(driver).toMatchObject({ licenseClasses: ["B", "C"], documents: ["SRC 2"] })

    const update = await app.inject({
      method: "PATCH",
      url: `/api/resources/${driver.id}`,
      headers,
      payload: {
        type: "DRIVER",
        companyId: "bplas",
        facilityId: "bplas-merkez",
        fullName: `MSSQL Şoför Güncel ${suffix}`,
        licenseClasses: ["D", "E"],
        documents: ["SRC 4", "Psikoteknik"],
        canDriveCommercialVehicles: false,
      },
    })
    expect(update.statusCode).toBe(200)
    const updatedDriver = update.json()
    expect(updatedDriver).toMatchObject({
      id: driver.id,
      type: "DRIVER",
      canDriveCommercialVehicles: false,
    })
    expect([...updatedDriver.licenseClasses].sort()).toEqual(["D", "E"])
    expect([...updatedDriver.documents].sort()).toEqual(["Psikoteknik", "SRC 4"])

    const [licenseClasses, documents] = await Promise.all([
      prisma.driverLicenseClass.findMany({ where: { resourceId: driver.id }, orderBy: { value: "asc" } }),
      prisma.driverDocument.findMany({ where: { resourceId: driver.id }, orderBy: { name: "asc" } }),
    ])
    expect(licenseClasses.map(({ value }) => value)).toEqual(["D", "E"])
    expect(documents.map(({ name }) => name)).toEqual(["Psikoteknik", "SRC 4"])
  })

  it("logs out and rejects the revoked session during hydration", async () => {
    const logout = await app.inject({ method: "POST", url: "/api/auth/logout", headers: { cookie: sessionCookie } })
    expect(logout.statusCode).toBe(204)

    const session = await app.inject({ method: "GET", url: "/api/auth/session", headers: { cookie: sessionCookie } })
    expect(session.statusCode).toBe(200)
    expect(session.json()).toEqual({ user: null })
  })
})
