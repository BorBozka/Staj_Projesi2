import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from "fastify"

import { forbiddenError, unauthorizedError } from "../lib/api-error.js"
import type { AppConfig } from "../config/env.js"
import { AuthService } from "./auth-service.js"
import type { ApplicationRole, SessionUser } from "./auth-types.js"

declare module "fastify" {
  interface FastifyRequest {
    currentUser: SessionUser | null
  }
}

export interface AuthGuards {
  requireAuthentication: preHandlerAsyncHookHandler
  requireRole: (...roles: ApplicationRole[]) => preHandlerAsyncHookHandler
}

export function createAuthGuards(authService: AuthService, config: Pick<AppConfig, "sessionCookieName">): AuthGuards {
  const authenticate = async (request: FastifyRequest) => {
    if (request.currentUser) return
    const user = await authService.getCurrentSession(request.cookies[config.sessionCookieName])
    if (!user) throw unauthorizedError()
    request.currentUser = user
  }
  const requireAuthentication: preHandlerAsyncHookHandler = async (request: FastifyRequest, _reply: FastifyReply) => authenticate(request)

  return {
    requireAuthentication,
    requireRole: (...roles) => async (request, _reply) => {
      await authenticate(request)
      if (!request.currentUser || !roles.includes(request.currentUser.role)) throw forbiddenError()
    },
  }
}
