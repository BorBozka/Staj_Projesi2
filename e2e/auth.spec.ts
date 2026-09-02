import { expect, test } from "@playwright/test"

import { DEMO, login, loginViaForm, logout, ROLE_HOME } from "./helpers"

test.describe("LOCAL authentication and role routing", () => {
  for (const who of ["employee", "manager", "admin", "security"] as const) {
    test(`${who} logs in through the form and lands on the role home`, async ({ page }) => {
      await loginViaForm(page, who)
      await expect(page).toHaveURL(new RegExp(`${ROLE_HOME[DEMO[who].role].replace(/\//g, "\\/")}$`))
    })
  }

  test("an unauthenticated visit to a protected route redirects to /login", async ({ page }) => {
    await page.goto("/manager/dashboard")
    await page.waitForURL("**/login")
    await expect(page.getByRole("button", { name: "Giriş Yap" })).toBeVisible()
  })

  test("a role cannot reach another role's area", async ({ page }) => {
    await login(page, "employee")
    await page.goto("/admin/users")
    // RoleGuard bounces a non-admin back to their own home.
    await page.waitForURL(`**${ROLE_HOME.EMPLOYEE}`)
  })

  test("after logout every protected route is inaccessible", async ({ page }) => {
    await loginViaForm(page, "manager")
    await logout(page)
    for (const route of ["/manager/dashboard", "/manager/all-visits", "/manager/reports", "/admin/users", "/security/operations"]) {
      await page.goto(route)
      await page.waitForURL("**/login")
      await expect(page.getByRole("button", { name: "Giriş Yap" })).toBeVisible()
    }
  })
})
