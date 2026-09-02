import type { FastifyInstance } from "fastify"
import { z } from "zod"

import type { AuthGuards } from "../../auth/auth-guards.js"
import { validationError } from "../../lib/api-error.js"
import { ReportsService } from "./service.js"

const querySchema = z.object({
  startDate: z.string().max(10).optional(),
  endDate: z.string().max(10).optional(),
  companyId: z.string().max(36).optional(),
  facilityId: z.string().max(36).optional(),
}).strict()

function parsed<T>(result: z.SafeParseReturnType<unknown, T>): T {
  if (!result.success) throw validationError()
  return result.data
}

export async function registerReportsRoutes(app: FastifyInstance, dependencies: { service: ReportsService; guards: AuthGuards }) {
  const guard = dependencies.guards.requireRole("MANAGER", "ADMIN")
  const service = dependencies.service

  app.get("/api/reports/visits", { preHandler: guard }, async (request) => service.getVisitsReport(parsed(querySchema.safeParse(request.query))))
  app.get("/api/reports/fleet", { preHandler: guard }, async (request) => service.getFleetReport(parsed(querySchema.safeParse(request.query))))
  app.get("/api/reports/goods", { preHandler: guard }, async (request) => service.getGoodsReport(parsed(querySchema.safeParse(request.query))))
}
