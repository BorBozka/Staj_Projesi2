import type { FastifyInstance } from "fastify"

export async function registerHealthRoutes(app: FastifyInstance, checkDatabase: () => Promise<void>): Promise<void> {
  app.get("/api/health", async () => ({ status: "ok" }))
  app.get("/api/ready", async (_request, reply) => {
    try {
      await checkDatabase()
      return { status: "ok" }
    } catch {
      return reply.status(503).send({ status: "unavailable" })
    }
  })
}
