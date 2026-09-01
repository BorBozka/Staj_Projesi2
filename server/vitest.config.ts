import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Argon2id hashing plus a full Fastify boot in one integration test can exceed the
    // 5s default on slower/loaded machines when suites run in parallel worker threads.
    testTimeout: 20_000,
  },
})
