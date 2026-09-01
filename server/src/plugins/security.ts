import cookie from "@fastify/cookie"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import rateLimit from "@fastify/rate-limit"
import type { FastifyInstance } from "fastify"

import type { AppConfig } from "../config/env.js"

export async function registerSecurityPlugins(app: FastifyInstance, config: AppConfig): Promise<void> {
  await app.register(cookie)
  await app.register(cors, { origin: config.webOrigin, credentials: true })
  await app.register(helmet)
  await app.register(rateLimit, { global: false })
}

export function sessionCookieOptions(config: Pick<AppConfig, "nodeEnv" | "sessionTtlHours">) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.nodeEnv === "production",
    path: "/",
    maxAge: config.sessionTtlHours * 60 * 60,
  }
}
