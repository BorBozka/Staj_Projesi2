import Fastify from "fastify"

import { createAuthGuards } from "./auth/auth-guards.js"
import { AuthService } from "./auth/auth-service.js"
import type { AppConfig } from "./config/env.js"
import { ApiError } from "./lib/api-error.js"
import { registerAccountRoutes } from "./modules/account/routes.js"
import { registerAuthRoutes } from "./modules/auth/routes.js"
import { registerHealthRoutes } from "./modules/health/routes.js"
import { registerOrganizationRoutes } from "./modules/organization/routes.js"
import { OrganizationService } from "./modules/organization/service.js"
import { registerAdminRoutes } from "./modules/admin/routes.js"
import { AdminService } from "./modules/admin/service.js"
import { registerSettingsRoutes } from "./modules/settings/routes.js"
import { SettingsService } from "./modules/settings/service.js"
import { registerResourceRoutes } from "./modules/resources/routes.js"
import { ResourceService } from "./modules/resources/service.js"
import { registerSecurityPlugins } from "./plugins/security.js"
import type { AuthRepository } from "./repositories/auth-repository.js"
import type { OrganizationRepository } from "./repositories/organization-repository.js"
import type { AdminRepository } from "./repositories/admin-repository.js"
import type { SettingsRepository } from "./repositories/settings-repository.js"
import type { ResourceRepository } from "./repositories/resource-repository.js"

export interface AppDependencies {
  authRepository: AuthRepository
  organizationRepository?: OrganizationRepository
  adminRepository?: AdminRepository
  settingsRepository?: SettingsRepository
  resourceRepository?: ResourceRepository
  checkDatabase?: () => Promise<void>
  authService?: AuthService
}

export async function buildApp(config: AppConfig, dependencies: AppDependencies) {
  const app = Fastify({
    logger: config.nodeEnv === "production",
    bodyLimit: 1_048_576,
  })
  const authService = dependencies.authService ?? new AuthService(dependencies.authRepository, { sessionTtlHours: config.sessionTtlHours })

  app.decorateRequest("currentUser", null)
  await registerSecurityPlugins(app, config)

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) return reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } })
    request.log.error(error)
    return reply.status(500).send({ error: { code: "INTERNAL_ERROR", message: "Beklenmeyen bir sunucu hatası oluştu." } })
  })

  const guards = createAuthGuards(authService, config)
  await registerAuthRoutes(app, { authService, config })
  await registerAccountRoutes(app, { authService, guards })
  await registerHealthRoutes(app, dependencies.checkDatabase ?? (async () => undefined))
  if (dependencies.organizationRepository) await registerOrganizationRoutes(app, { service: new OrganizationService(dependencies.organizationRepository), guards })
  if (dependencies.adminRepository) await registerAdminRoutes(app, { service: new AdminService(dependencies.adminRepository), guards })
  if (dependencies.settingsRepository) await registerSettingsRoutes(app, { service: new SettingsService(dependencies.settingsRepository), guards })
  if (dependencies.resourceRepository) await registerResourceRoutes(app, { service: new ResourceService(dependencies.resourceRepository), guards })

  return app
}
