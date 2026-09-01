import { z } from "zod"

const booleanFromEnvironment = z.enum(["true", "false"]).transform((value) => value === "true")

const environmentSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL zorunludur.").regex(/^sqlserver:\/\//, "DATABASE_URL Prisma SQL Server formatında olmalıdır."),
  SESSION_COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/, "SESSION_COOKIE_NAME yalnız güvenli cookie karakterleri içermelidir.").default("bplas_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(8),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEMO_SEED_ENABLED: booleanFromEnvironment.default("false"),
})

export type AppConfig = {
  apiPort: number
  webOrigin: string
  databaseUrl: string
  sessionCookieName: string
  sessionTtlHours: number
  nodeEnv: "development" | "test" | "production"
  demoSeedEnabled: boolean
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConfigError"
  }
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = environmentSchema.safeParse(environment)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    throw new ConfigError(`Geçersiz server yapılandırması: ${issues}`)
  }

  return {
    apiPort: parsed.data.API_PORT,
    webOrigin: parsed.data.WEB_ORIGIN,
    databaseUrl: parsed.data.DATABASE_URL,
    sessionCookieName: parsed.data.SESSION_COOKIE_NAME,
    sessionTtlHours: parsed.data.SESSION_TTL_HOURS,
    nodeEnv: parsed.data.NODE_ENV,
    demoSeedEnabled: parsed.data.DEMO_SEED_ENABLED,
  }
}
