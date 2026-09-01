import Fastify from "fastify"

import { createAuthGuards } from "./auth/auth-guards.js"
import { AuthService } from "./auth/auth-service.js"
import type { AppConfig } from "./config/env.js"
import { ApiError } from "./lib/api-error.js"
import { registerAccountRoutes } from "./modules/account/routes.js"
import { registerAuthRoutes } from "./modules/auth/routes.js"
import { registerHealthRoutes } from "./modules/health/routes.js"
import { registerSecurityPlugins } from "./plugins/security.js"
import type { AuthRepository } from "./repositories/auth-repository.js"

export interface AppDependencies {
  authRepository: AuthRepository
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

  return app
}
