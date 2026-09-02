import { expect, test } from "@playwright/test"

import { login, runSuffix } from "./helpers"

const API = "http://localhost:3001/api"

test("security operations page loads scoped data", async ({ page }) => {
  await login(page, "security")
  await expect(page.getByRole("heading", { name: /Güvenlik Operasyonu/i })).toBeVisible()
  await expect(page.getByLabel(/Ziyaretçi, firma veya ev sahibi ara/)).toBeVisible()

  // The security visits feed is limited to the gate user's operational, in-scope subset.
  const visits = await page.request.get(`${API}/visits`).then((r) => r.json())
  for (const visit of visits) {
    expect(visit.meeting.hostCompanyId).toBe("bplas")
    expect(["PLANNED", "CHECKED_IN"]).toContain(visit.status)
  }
})

test("security creates an unplanned visitor and then checks them out", async ({ page }) => {
  await login(page, "security")
  const suffix = runSuffix()

  const cards = await page.request.get(`${API}/security/visitor-cards/available`).then((r) => r.json())
  expect(cards.length).toBeGreaterThan(0)

  const created = await page.request.post(`${API}/security/unplanned-visits`, {
    data: {
      firstName: "Plansız", lastName: `E2E-${suffix}`, company: "Acme", hostEmployeeName: "Serbest Ev Sahibi",
      visitTypeId: "meeting", durationMinutes: 45, visitorCardId: cards[0].id, rulesAccepted: true,
      companyId: "bplas", facilityId: "bplas-merkez",
    },
  })
  expect(created.status()).toBe(201)
  const visit = await created.json()
  expect(visit.status).toBe("CHECKED_IN")

  // The unplanned visitor is now inside; the security page renders them.
  await page.reload()
  await expect(page.getByText(`Plansız E2E-${suffix}`).first()).toBeVisible({ timeout: 15_000 })

  const checkedOut = await page.request.post(`${API}/security/visits/${visit.id}/check-out`, { data: { cardReturned: true } })
  expect(checkedOut.status()).toBe(200)
  expect((await checkedOut.json()).status).toBe("CHECKED_OUT")

  // Out of scope is rejected — the client-supplied company/facility is not trusted.
  const outOfScope = await page.request.post(`${API}/security/unplanned-visits`, {
    data: {
      firstName: "X", lastName: "Y", company: "Acme", hostEmployeeName: "Z", visitTypeId: "meeting",
      durationMinutes: 30, visitorCardId: cards[0].id, rulesAccepted: true,
      companyId: "bplas-otomotiv", facilityId: "bplas-otomotiv-merkez",
    },
  })
  expect(outOfScope.status()).toBe(403)
})

test("security completes a goods movement inside its scope", async ({ page }) => {
  const suffix = runSuffix()
  const today = new Date().toISOString().slice(0, 10)

  // A manager plans an inbound movement for today.
  await login(page, "manager")
  const planned = await page.request.post(`${API}/goods-movements`, {
    data: {
      direction: "INBOUND", companyId: "bplas", facilityId: "bplas-merkez",
      counterpartyName: `Tedarik ${suffix}`, plannedDate: today, plannedTime: "09:00",
      goodsDescription: "E2E palet",
    },
  })
  expect(planned.status()).toBe(201)
  const movementId = (await planned.json()).id as string

  // Security sees it on the scoped operational list and completes it.
  await login(page, "security")
  await page.goto("/security/goods-movements")
  const scoped = await page.request.get(`${API}/security/goods-movements`).then((r) => r.json())
  expect(scoped.some((m: { id: string }) => m.id === movementId)).toBe(true)

  const completed = await page.request.post(`${API}/security/goods-movements/${movementId}/complete`, {
    data: { companyId: "bplas", facilityId: "bplas-merkez", actualPlate: "34 E2E 34" },
  })
  expect(completed.status()).toBe(200)
  expect((await completed.json()).status).toBe("COMPLETED")
})
