import type { FastifyInstance } from "fastify"
import { z } from "zod"

import type { AuthGuards } from "../../auth/auth-guards.js"
import { validationError } from "../../lib/api-error.js"
import { ResourceAssignmentService } from "./service.js"

const id = z.string().min(1).max(36)
const meetingParams = z.object({ meetingId: id }).strict()
const assignmentParams = z.object({ id }).strict()
const roomBody = z.object({ resourceId: id }).strict()
const equipmentBody = z.object({ resourceId: id, requestedQuantity: z.number().int() }).strict()
const quantityBody = z.object({ requestedQuantity: z.number().int() }).strict()
const desiredBody = z.object({
  roomResourceId: id.nullable(),
  equipment: z.array(z.object({ resourceId: id, requestedQuantity: z.number().int() }).strict()).max(100),
}).strict()

function parsed<T>(result: z.SafeParseReturnType<unknown, T>): T {
  if (!result.success) throw validationError()
  return result.data
}

export async function registerResourceAssignmentRoutes(app: FastifyInstance, dependencies: { service: ResourceAssignmentService; guards: AuthGuards }) {
  const guard = dependencies.guards.requireRole("MANAGER", "ADMIN")
  const service = dependencies.service

  app.get("/api/meetings/:meetingId/resource-assignments", { preHandler: guard }, async (request) =>
    service.listAssignmentsForMeeting(parsed(meetingParams.safeParse(request.params)).meetingId))
  app.get("/api/meetings/:meetingId/eligible-rooms", { preHandler: guard }, async (request) =>
    service.getEligibleRooms(parsed(meetingParams.safeParse(request.params)).meetingId))
  app.get("/api/meetings/:meetingId/eligible-equipment", { preHandler: guard }, async (request) =>
    service.getEligibleEquipment(parsed(meetingParams.safeParse(request.params)).meetingId))

  app.post("/api/meetings/:meetingId/resource-assignments/room", { preHandler: guard }, async (request, reply) =>
    reply.status(201).send(await service.assignRoom(parsed(meetingParams.safeParse(request.params)).meetingId, parsed(roomBody.safeParse(request.body)))))
  app.post("/api/meetings/:meetingId/resource-assignments/equipment", { preHandler: guard }, async (request, reply) =>
    reply.status(201).send(await service.assignEquipment(parsed(meetingParams.safeParse(request.params)).meetingId, parsed(equipmentBody.safeParse(request.body)))))
  app.put("/api/meetings/:meetingId/resource-assignments", { preHandler: guard }, async (request) =>
    service.saveMeetingAssignments(parsed(meetingParams.safeParse(request.params)).meetingId, parsed(desiredBody.safeParse(request.body))))

  app.patch("/api/resource-assignments/:id", { preHandler: guard }, async (request) =>
    service.updateEquipmentAssignment(parsed(assignmentParams.safeParse(request.params)).id, parsed(quantityBody.safeParse(request.body)).requestedQuantity))
  app.delete("/api/resource-assignments/:id", { preHandler: guard }, async (request, reply) => {
    await service.removeAssignment(parsed(assignmentParams.safeParse(request.params)).id)
    return reply.status(204).send()
  })
}
