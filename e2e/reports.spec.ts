import { expect, test } from "@playwright/test"

import { login } from "./helpers"

const API = "http://localhost:3001/api"

test("all three report tabs open on real backend data", async ({ page }) => {
  await login(page, "manager")
  await page.goto("/manager/reports")

  // Each dataset endpoint answers 200 with the expected shape, scoped to the manager.
  const visits = await page.request.get(`${API}/reports/visits`).then((r) => r.json())
  const fleet = await page.request.get(`${API}/reports/fleet`).then((r) => r.json())
  const goods = await page.request.get(`${API}/reports/goods`).then((r) => r.json())
  expect(Array.isArray(visits.visits)).toBe(true)
  expect(Array.isArray(fleet.assignments)).toBe(true)
  expect(Array.isArray(goods.movements)).toBe(true)
  for (const visit of visits.visits) expect(visit.meeting.hostCompanyId).toBe("bplas")

  for (const tab of ["Ziyaretler", "Araç", "Mal Hareketi"]) {
    await page.getByRole("tab", { name: new RegExp(tab, "i") }).click()
    await expect(page.getByRole("tab", { name: new RegExp(tab, "i") })).toHaveAttribute("aria-selected", "true")
  }
  // No silent empty-state masking a failed request: the page is not stuck on a skeleton/error.
  await expect(page.getByRole("alert").filter({ hasText: /yüklenemedi|hata/i })).toHaveCount(0)
})

test("a rejected report request is rejected, not silently empty", async ({ page }) => {
  await login(page, "security")
  const denied = await page.request.get(`${API}/reports/visits`)
  expect(denied.status()).toBe(403)
})
