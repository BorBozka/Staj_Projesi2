import type { AuthUserRecord, SessionRecord, SessionWithUser } from "../auth/auth-types.js"

export interface CreateSessionInput {
  userId: string
  tokenHash: string
  createdAt: Date
  expiresAt: Date
}

/** Authentication's persistence boundary. Services remain unit-testable without MSSQL. */
export interface AuthRepository {
  findUserByUsernameNormalized(usernameNormalized: string): Promise<AuthUserRecord | null>
  findUserById(id: string): Promise<AuthUserRecord | null>
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>
  createSession(input: CreateSessionInput): Promise<SessionRecord>
  findSessionByTokenHash(tokenHash: string): Promise<SessionWithUser | null>
  touchSession(tokenHash: string, usedAt: Date): Promise<void>
  revokeSessionByTokenHash(tokenHash: string, revokedAt: Date): Promise<void>
}
