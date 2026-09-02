import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AuthGuards } from "../../auth/auth-guards.js"
import { toAccessContext } from "../../lib/authorization.js"
import { validationError } from "../../lib/api-error.js"
import { resourceTypes } from "./types.js"
import { ResourceService } from "./service.js"

const idSchema = z.object({ id: z.string().min(1).max(36) }).strict()
const resourceBody = z.discriminatedUnion("type", [z.object({ type: z.literal("ROOM"), companyId: z.string().min(1).max(36), facilityId: z.string().min(1).max(36), name: z.string().max(200) }).strict(), z.object({ type: z.literal("POOLED_EQUIPMENT"), companyId: z.string().min(1).max(36), facilityId: z.string().min(1).max(36), name: z.string().max(200), totalQuantity: z.number().int() }).strict(), z.object({ type: z.literal("VEHICLE"), companyId: z.string().min(1).max(36), facilityId: z.string().min(1).max(36), brand: z.string().max(100), model: z.string().max(100), licensePlate: z.string().max(32) }).strict(), z.object({ type: z.literal("DRIVER"), companyId: z.string().min(1).max(36), facilityId: z.string().min(1).max(36), fullName: z.string().max(200), licenseClasses: z.array(z.string().max(20)).max(20), documents: z.array(z.string().max(200)).max(50), canDriveCommercialVehicles: z.boolean() }).strict()])
const querySchema = z.object({ includeInactive: z.enum(["true", "false"]).optional().transform((value) => value === "true"), companyId: z.string().min(1).max(36).optional(), facilityId: z.string().min(1).max(36).optional(), type: z.enum(resourceTypes).optional() }).strict()

export async function registerResourceRoutes(app: FastifyInstance, dependencies: { service: ResourceService; guards: AuthGuards }) {
  const guard = dependencies.guards.requireRole("ADMIN", "MANAGER")
  app.get("/api/resources", { preHandler: guard }, async (request) => { const parsed = querySchema.safeParse(request.query); if (!parsed.success) throw validationError(); return dependencies.service.list(parsed.data, toAccessContext(request.currentUser!)) })
  app.get("/api/resources/:id", { preHandler: guard }, async (request) => { const parsed = idSchema.safeParse(request.params); if (!parsed.success) throw validationError(); return dependencies.service.get(parsed.data.id, toAccessContext(request.currentUser!)) })
  app.post("/api/resources", { preHandler: guard }, async (request, reply) => { const parsed = resourceBody.safeParse(request.body); if (!parsed.success) throw validationError(); return reply.status(201).send(await dependencies.service.create(parsed.data, toAccessContext(request.currentUser!))) })
  app.patch("/api/resources/:id", { preHandler: guard }, async (request) => { const params = idSchema.safeParse(request.params); const body = resourceBody.safeParse(request.body); if (!params.success || !body.success) throw validationError(); return dependencies.service.update(params.data.id, body.data, toAccessContext(request.currentUser!)) })
  app.patch("/api/resources/:id/status", { preHandler: guard }, async (request) => { const params = idSchema.safeParse(request.params); const body = z.object({ active: z.boolean() }).strict().safeParse(request.body); if (!params.success || !body.success) throw validationError(); return dependencies.service.setActive(params.data.id, body.data.active, toAccessContext(request.currentUser!)) })
  app.delete("/api/resources/:id", { preHandler: guard }, async (request, reply) => { const params = idSchema.safeParse(request.params); if (!params.success) throw validationError(); await dependencies.service.remove(params.data.id, toAccessContext(request.currentUser!)); return reply.status(204).send() })
}
