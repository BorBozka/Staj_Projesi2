import type { FastifyInstance } from "fastify"
import { z } from "zod"

import type { AuthService } from "../../auth/auth-service.js"
import type { AppConfig } from "../../config/env.js"
import { validationError } from "../../lib/api-error.js"
import { sessionCookieOptions } from "../../plugins/security.js"

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(1_024),
}).strict()

export async function registerAuthRoutes(app: FastifyInstance, dependencies: { authService: AuthService; config: AppConfig }): Promise<void> {
  const { authService, config } = dependencies

  app.post("/api/auth/login", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) throw validationError()
    const session = await authService.login(parsed.data.username, parsed.data.password)
    reply.setCookie(config.sessionCookieName, session.rawSessionToken, sessionCookieOptions(config))
    return { user: session.user }
  })

  app.get("/api/auth/session", async (request) => ({
    user: await authService.getCurrentSession(request.cookies[config.sessionCookieName]),
  }))

  app.post("/api/auth/logout", async (request, reply) => {
    await authService.logout(request.cookies[config.sessionCookieName])
    reply.clearCookie(config.sessionCookieName, { path: "/", httpOnly: true, sameSite: "lax", secure: config.nodeEnv === "production" })
    return reply.status(204).send()
  })
}
