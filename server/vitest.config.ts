import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Argon2id hashing plus a full Fastify boot in one integration test can exceed the
    // 5s default on slower/loaded machines when suites run in parallel worker threads.
    testTimeout: 20_000,
    // The opt-in MSSQL integration files share one SQL Server database. Running test files in
    // parallel worker threads lets their SERIALIZABLE transactions deadlock across files
    // non-deterministically, so files run one at a time. The unit suite is unaffected in
    // substance (each file still runs its own cases in order) and stays fast.
    fileParallelism: false,
  },
})
