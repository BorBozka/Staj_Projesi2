import path from "node:path"
import { configDefaults, defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // The backend is its own workspace with a Node-only Vitest configuration.
  // Keeping its Fastify dependency graph out of frontend tests avoids cross-project resolution.
  // `e2e/**` holds Playwright `*.spec.ts` files, run only by `pnpm e2e`, never Vitest.
  test: {
    exclude: [...configDefaults.exclude, "server/**", "e2e/**"],
  },
})
