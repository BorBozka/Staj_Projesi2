import { expect, test } from "@playwright/test"

import { login, runSuffix } from "./helpers"

const API = "http://localhost:3001/api"

test("admin performs a real visit-type CRUD from the admin area", async ({ page }) => {
  await login(page, "admin")
  const suffix = runSuffix()
  const name = `E2E Tür ${suffix}`

  const created = await page.request.post(`${API}/visit-types`, { data: { name, active: true } })
  expect(created.status()).toBe(201)
  const id = (await created.json()).id as string

  const renamed = await page.request.patch(`${API}/visit-types/${id}`, { data: { name: `${name} v2`, active: true } })
  expect(renamed.status()).toBe(200)
  expect((await renamed.json()).name).toBe(`${name} v2`)

  const list = await page.request.get(`${API}/visit-types?includeInactive=true`).then((r) => r.json())
  expect(list.some((t: { id: string; name: string }) => t.id === id && t.name === `${name} v2`)).toBe(true)

  // The admin users screen renders real data.
  await page.goto("/admin/users")
  await expect(page.getByText("admin").first()).toBeVisible({ timeout: 15_000 })
})

test("a resource assignment is saved for a meeting", async ({ page }) => {
  await login(page, "admin")
  const suffix = runSuffix()

  const room = await page.request
    .post(`${API}/resources`, { data: { type: "ROOM", companyId: "bplas", facilityId: "bplas-merkez", name: `E2E Oda ${suffix}` } })
    .then((r) => r.json())

  // A meeting to attach it to.
  await login(page, "employee")
  const meeting = await page.request
    .post(`${API}/meetings`, {
      data: {
        visitors: [{ firstName: "Res", lastName: `E2E-${suffix}`, company: "Acme" }],
        visitTypeId: "meeting", hostEmployeeName: "Maya Kara", hostCompanyId: "bplas", facilityId: "bplas-merkez",
        plannedStart: new Date(Date.now() + 3_600_000).toISOString(),
        plannedEnd: new Date(Date.now() + 7_200_000).toISOString(),
      },
    })
    .then((r) => r.json())

  await login(page, "manager")
  const saved = await page.request.put(`${API}/meetings/${meeting.meeting.id}/resource-assignments`, {
    data: { roomResourceId: room.id, equipment: [] },
  })
  expect(saved.status()).toBe(200)
  const views = await saved.json()
  expect(views.some((v: { resourceId: string; resourceType: string }) => v.resourceId === room.id && v.resourceType === "ROOM")).toBe(true)

  // The assignment survives a re-read (persisted, not just echoed).
  const reread = await page.request.get(`${API}/meetings/${meeting.meeting.id}/resource-assignments`).then((r) => r.json())
  expect(reread.some((v: { resourceId: string }) => v.resourceId === room.id)).toBe(true)

  await page.goto("/manager/resources")
  await expect(page.getByRole("combobox").first().or(page.getByRole("table")).first()).toBeVisible({ timeout: 15_000 })
})

test("a transport assignment is created and then cancelled", async ({ page }) => {
  await login(page, "admin")
  const suffix = runSuffix()
  const vehicle = await page.request
    .post(`${API}/resources`, { data: { type: "VEHICLE", companyId: "bplas", facilityId: "bplas-merkez", brand: "Ford", model: "Transit", licensePlate: `34 E2E ${suffix}` } })
    .then((r) => r.json())
  const driver = await page.request
    .post(`${API}/resources`, { data: { type: "DRIVER", companyId: "bplas", facilityId: "bplas-merkez", fullName: `E2E Şoför ${suffix}`, licenseClasses: ["B"], documents: [], canDriveCommercialVehicles: false } })
    .then((r) => r.json())

  await login(page, "manager")
  const start = new Date(Date.now() + 3_600_000).toISOString()
  const end = new Date(Date.now() + 7_200_000).toISOString()
  const created = await page.request.post(`${API}/transport-assignments`, {
    data: { companyId: "bplas", facilityId: "bplas-merkez", plannedStart: start, plannedEnd: end, purpose: `E2E görev ${suffix}`, vehicleResourceId: vehicle.id, driverResourceId: driver.id },
  })
  expect(created.status()).toBe(201)
  const assignmentId = (await created.json()).id as string

  const cancelled = await page.request.post(`${API}/transport-assignments/${assignmentId}/cancel`)
  expect(cancelled.status()).toBe(200)
  expect((await cancelled.json()).status).toBe("CANCELLED")

  await page.goto("/manager/transport-planning")
  await expect(page.getByRole("heading", { level: 1 }).or(page.getByText(/Araç ve Şoför|Planlama/i)).first()).toBeVisible({ timeout: 15_000 })
})
