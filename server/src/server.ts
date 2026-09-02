import "dotenv/config"

import { PrismaClient } from "@prisma/client"

import { buildApp } from "./app.js"
import { loadConfig } from "./config/env.js"
import { PrismaAuthRepository } from "./repositories/prisma-auth-repository.js"
import { PrismaOrganizationRepository } from "./repositories/prisma-organization-repository.js"
import { PrismaAdminRepository } from "./repositories/prisma-admin-repository.js"
import { PrismaSettingsRepository } from "./repositories/prisma-settings-repository.js"
import { PrismaResourceRepository } from "./repositories/prisma-resource-repository.js"
import { PrismaResourceAssignmentRepository } from "./repositories/resource-assignment-repository.js"
import { PrismaVisitorOperationsRepository } from "./repositories/visitor-operations-repository.js"
import { PrismaGoodsMovementRepository } from "./repositories/goods-movement-repository.js"
import { PrismaTransportAssignmentRepository } from "./repositories/transport-assignment-repository.js"
import { PrismaReportsRepository } from "./repositories/reports-repository.js"
import { createEmailSender } from "./delivery/create-email-sender.js"

const config = loadConfig()
const prisma = new PrismaClient()
const resourceAssignmentRepository = new PrismaResourceAssignmentRepository(prisma)
const app = await buildApp(config, {
  authRepository: new PrismaAuthRepository(prisma),
  organizationRepository: new PrismaOrganizationRepository(prisma),
  adminRepository: new PrismaAdminRepository(prisma),
  settingsRepository: new PrismaSettingsRepository(prisma),
  resourceRepository: new PrismaResourceRepository(prisma),
  visitorOperationsRepository: new PrismaVisitorOperationsRepository(prisma, resourceAssignmentRepository),
  goodsMovementRepository: new PrismaGoodsMovementRepository(prisma),
  resourceAssignmentRepository,
  transportAssignmentRepository: new PrismaTransportAssignmentRepository(prisma),
  reportsRepository: new PrismaReportsRepository(prisma),
  emailSender: createEmailSender(config.emailDelivery),
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
