import type { FastifyInstance } from "fastify"
import { z } from "zod"

import type { AuthGuards } from "../../auth/auth-guards.js"
import { validationError } from "../../lib/api-error.js"
import { TransportAssignmentService } from "./service.js"

const id = z.string().min(1).max(36)
const idParams = z.object({ id }).strict()
const timestamp = z.string().datetime({ offset: true })
const assignmentBody = z.object({
  companyId: id,
  facilityId: id,
  plannedStart: timestamp,
  plannedEnd: timestamp,
  purpose: z.string().max(1_000),
  vehicleResourceId: id,
  driverResourceId: id,
  relatedMeetingId: id.optional(),
  relatedVisitId: id.optional(),
}).strict()
const availabilityBody = z.object({
  companyId: id,
  facilityId: id,
  plannedStart: timestamp,
  plannedEnd: timestamp,
  excludeAssignmentId: id.optional(),
}).strict()

function parsed<T>(result: z.SafeParseReturnType<unknown, T>): T {
  if (!result.success) throw validationError()
  return result.data
}

export async function registerTransportAssignmentRoutes(app: FastifyInstance, dependencies: { service: TransportAssignmentService; guards: AuthGuards }) {
  const guard = dependencies.guards.requireRole("MANAGER", "ADMIN")
  const service = dependencies.service

  app.get("/api/transport-assignments", { preHandler: guard }, async () => service.listAssignments())
  app.post("/api/transport-assignments/availability", { preHandler: guard }, async (request) =>
    service.getAvailability(parsed(availabilityBody.safeParse(request.body))))
  app.post("/api/transport-assignments", { preHandler: guard }, async (request, reply) =>
    reply.status(201).send(await service.createAssignment(parsed(assignmentBody.safeParse(request.body)))))
  app.patch("/api/transport-assignments/:id", { preHandler: guard }, async (request) =>
    service.updateAssignment(parsed(idParams.safeParse(request.params)).id, parsed(assignmentBody.safeParse(request.body))))
  app.post("/api/transport-assignments/:id/cancel", { preHandler: guard }, async (request) =>
    service.cancelAssignment(parsed(idParams.safeParse(request.params)).id))
}
