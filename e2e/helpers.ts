import { expect, type Page } from "@playwright/test"

const API = "http://localhost:3001/api"

export const ROLE_HOME: Record<string, string> = {
  EMPLOYEE: "/employee/my-visits",
  MANAGER: "/manager/dashboard",
  ADMIN: "/admin/dashboard",
  SECURITY: "/security/operations",
}

export const DEMO = {
  employee: { username: "calisan", password: "calisan", role: "EMPLOYEE" },
  employee2: { username: "calisan2", password: "calisan2", role: "EMPLOYEE" },
  manager: { username: "yonetici", password: "yonetici", role: "MANAGER" },
  managerOtomotiv: { username: "yonetici2", password: "yonetici2", role: "MANAGER" },
  admin: { username: "admin", password: "admin", role: "ADMIN" },
  security: { username: "guvenlik", password: "guvenlik", role: "SECURITY" },
} as const

/** Unique-per-run suffix so parallel/repeat runs never collide on unique fields. */
export function runSuffix(): string {
  return `${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 1000)}`
}

/**
 * Establishes a real HttpOnly cookie session via `POST /api/auth/login` (same cookie the form
 * would set), then lands on the role home. Used by the operational specs so the login
 * rate-limit budget is reserved for the specs that exercise the form itself.
 */
export async function login(page: Page, who: keyof typeof DEMO): Promise<void> {
  const account = DEMO[who]
  await page.context().clearCookies()
  const response = await page.request.post(`${API}/auth/login`, { data: { username: account.username, password: account.password } })
  expect(response.status(), `login ${who}`).toBe(200)
  await page.goto(ROLE_HOME[account.role], { waitUntil: "domcontentloaded" })
  await page.waitForURL(`**${ROLE_HOME[account.role]}`, { timeout: 30_000 })
}

/** Signs in through the real login form (for the auth specs). */
export async function loginViaForm(page: Page, who: keyof typeof DEMO): Promise<void> {
  const account = DEMO[who]
  await page.context().clearCookies()
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.getByLabel("Kullanıcı adı").fill(account.username)
  await page.getByLabel("Şifre", { exact: true }).fill(account.password)
  await page.getByRole("button", { name: "Giriş Yap" }).click()
  await page.waitForURL(`**${ROLE_HOME[account.role]}`, { timeout: 45_000 })
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Hesap menüsü/ }).click()
  await page.getByRole("menuitem", { name: /Çıkış/ }).click()
  await page.waitForURL("**/login")
}
