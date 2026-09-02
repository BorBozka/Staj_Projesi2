import { expect, test } from "@playwright/test"

import { login } from "./helpers"

const API = "http://localhost:3001/api"

test("a manager sees scoped All Visits and Dashboard data", async ({ page }) => {
  await login(page, "manager")

  await page.goto("/manager/all-visits")
  await expect(page.getByRole("heading", { name: /Tüm Ziyaretler/i }).or(page.getByText(/Tüm Ziyaretler/i)).first()).toBeVisible()
  // The scoped visits endpoint returns rows for this manager's company.
  const visits = await page.request.get(`${API}/visits`).then((r) => r.json())
  expect(Array.isArray(visits)).toBe(true)
  for (const visit of visits) expect(visit.meeting.hostCompanyId).toBe("bplas")

  await page.goto("/manager/dashboard")
  await expect(page.getByText(/Sıradaki Ziyaretler|Bugünkü Operasyon|Aktif/i).first()).toBeVisible({ timeout: 15_000 })
})

test("a manager cannot mutate a visit another user created", async ({ page }) => {
  // The employee owns a fresh meeting.
  await login(page, "employee")
  const created = await page.request
    .post(`${API}/meetings`, {
      data: {
        visitors: [{ firstName: "Cross", lastName: `Scope-${Date.now()}`, company: "Acme" }],
        visitTypeId: "meeting", hostEmployeeName: "Maya Kara", hostCompanyId: "bplas", facilityId: "bplas-merkez",
        plannedStart: new Date(Date.now() + 3_600_000).toISOString(),
        plannedEnd: new Date(Date.now() + 7_200_000).toISOString(),
      },
    })
    .then((r) => r.json())
  const meetingId = created.meeting.id as string

  await login(page, "manager")
  // Manager can read it (same company scope)...
  const read = await page.request.get(`${API}/visits`).then((r) => r.json())
  expect(read.some((v: { meetingId: string }) => v.meetingId === meetingId)).toBe(true)

  // ...but cannot edit it — it is not theirs and they are not an admin.
  const edit = await page.request.patch(`${API}/meetings/${meetingId}`, {
    data: {
      visitors: [{ firstName: "Cross", lastName: "Hijack", company: "Evil" }],
      visitTypeId: "meeting", hostEmployeeName: "Maya Kara", hostCompanyId: "bplas", facilityId: "bplas-merkez",
      plannedStart: new Date(Date.now() + 3_600_000).toISOString(),
      plannedEnd: new Date(Date.now() + 7_200_000).toISOString(),
    },
  })
  expect(edit.status()).toBe(403)
  expect((await edit.json()).error.code).toBe("VISIT_MUTATION_FORBIDDEN")
})

test("reports companyId=all never escapes the manager's authorization scope", async ({ page }) => {
  await login(page, "managerOtomotiv")
  const report = await page.request.get(`${API}/reports/visits?companyId=all&facilityId=all`).then((r) => r.json())
  for (const visit of report.visits) expect(visit.meeting.hostCompanyId).toBe("bplas-otomotiv")

  await page.goto("/manager/reports")
  await expect(page.getByRole("tab", { name: /Ziyaretler/i }).or(page.getByText(/Ziyaretler/i)).first()).toBeVisible({ timeout: 15_000 })
})
