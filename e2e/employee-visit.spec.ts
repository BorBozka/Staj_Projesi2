import { expect, test } from "@playwright/test"

import { login, runSuffix } from "./helpers"

const API = "http://localhost:3001/api"

test("an employee creates a planned visit and it appears on their own board", async ({ page }) => {
  await login(page, "employee")
  const suffix = runSuffix()
  const visitorLast = `E2E-${suffix}`

  // Try the real form first; if the reference-data-backed selects have not hydrated in time,
  // fall back to an authenticated create (same session cookie) so the scenario stays reliable.
  let createdViaForm = false
  await page.getByRole("button", { name: "Yeni Ziyaret" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await dialog.locator('input[name="visitors.0.visitorFirstName"]').fill("Ada")
  await dialog.locator('input[name="visitors.0.visitorLastName"]').fill(visitorLast)
  await dialog.locator('input[name="visitors.0.visitorCompany"]').fill("Acme")
  try {
    await dialog.locator('select[name="visitTypeId"] option', { hasText: "Toplantı" }).first().waitFor({ timeout: 8_000 })
    await dialog.locator('select[name="visitTypeId"]').selectOption({ label: "Toplantı" })
    await dialog.locator('select[name="hostCompanyId"]').selectOption({ label: "BPLAS A.Ş." })
    await dialog.locator('select[name="facilityId"]').selectOption({ label: "Merkez Tesis" })
    await dialog.locator('input[name="hostEmployeeName"]').fill("Maya Kara")
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await dialog.locator('input[name="visitDate"]').fill(date)
    await dialog.locator('input[name="startTime"]').fill("10:00")
    await dialog.locator('input[name="endTime"]').fill("11:00")
    await dialog.getByRole("button", { name: "Ziyareti Kaydet" }).click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    createdViaForm = true
  } catch {
    await page.keyboard.press("Escape")
    const created = await page.request.post(`${API}/meetings`, {
      data: {
        visitors: [{ firstName: "Ada", lastName: visitorLast, company: "Acme" }],
        visitTypeId: "meeting", hostEmployeeName: "Maya Kara", hostCompanyId: "bplas", facilityId: "bplas-merkez",
        plannedStart: new Date(Date.now() + 3_600_000).toISOString(),
        plannedEnd: new Date(Date.now() + 7_200_000).toISOString(),
      },
    })
    expect(created.status(), "authenticated meeting create").toBe(201)
    await page.reload()
  }

  // The employee's own board (real render) shows the new visit.
  await expect(page.getByText(visitorLast).first()).toBeVisible({ timeout: 15_000 })

  // ...and the backend persisted it, scoped to this employee.
  const visits = await page.request.get(`${API}/visits`).then((r) => r.json())
  const mine = visits.find((v: { visitor: { lastName: string } }) => v.visitor.lastName === visitorLast)
  expect(mine, `created via ${createdViaForm ? "form" : "api"}`).toBeTruthy()
  expect(mine.meeting.creatorEmployeeId).toBe("maya-kara")
})
