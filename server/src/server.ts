import "dotenv/config"

import { PrismaClient } from "@prisma/client"

import { buildApp } from "./app.js"
import { loadConfig } from "./config/env.js"
import { PrismaAuthRepository } from "./repositories/prisma-auth-repository.js"

const config = loadConfig()
const prisma = new PrismaClient()
const app = await buildApp(config, {
  authRepository: new PrismaAuthRepository(prisma),
  checkDatabase: async () => { await prisma.$queryRawUnsafe("SELECT 1") },
})

app.addHook("onClose", async () => { await prisma.$disconnect() })

try {
  await app.listen({ port: config.apiPort, host: "0.0.0.0" })
} catch (error) {
  app.log.error(error)
  process.exitCode = 1
  await app.close()
}
