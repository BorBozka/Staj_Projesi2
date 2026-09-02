import { chromium, type FullConfig } from "@playwright/test"

/**
 * Warms the Vite dev server. Its first request triggers on-demand compilation of the whole app
 * graph, which can exceed a normal test timeout; paying that cost once here keeps every spec fast.
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:5173"
  const browser = await chromium.launch()
  const page = await browser.newPage()
  try {
    await page.goto(`${baseURL}/login`, { waitUntil: "load", timeout: 180_000 })
    await page.getByRole("button", { name: "Giriş Yap" }).waitFor({ timeout: 60_000 })
  } finally {
    await browser.close()
  }
}

export default globalSetup
