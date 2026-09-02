import type { PrismaClient } from "@prisma/client"

import { parseApplicationRole, parseAuthenticationSource, type AuthUserRecord, type SessionRecord, type SessionWithUser } from "../auth/auth-types.js"
import type { AuthRepository, CreateSessionInput } from "./auth-repository.js"

const userSelect = {
  id: true,
  username: true,
  fullName: true,
  role: true,
  authenticationSource: true,
  active: true,
  passwordHash: true,
} as const

function toUserRecord(user: {
  id: string
  username: string
  fullName: string
  role: string
  authenticationSource: string
  active: boolean
  passwordHash: string | null
}): AuthUserRecord {
  const role = parseApplicationRole(user.role)
  const authenticationSource = parseAuthenticationSource(user.authenticationSource)
  if (!role || !authenticationSource) throw new Error("Unsupported persisted user role or authentication source.")
  return {
    ...user,
    role,
    authenticationSource,
  }
}

function toSessionRecord(session: {
  id: string
  userId: string
  tokenHash: string
  createdAt: Date
  expiresAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
}): SessionRecord {
  return session
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByUsernameNormalized(usernameNormalized: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { usernameNormalized }, select: userSelect })
    return user ? toUserRecord(user) : null
  }

  async findUserById(id: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect })
    return user ? toUserRecord(user) : null
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  }

  async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    const session = await this.prisma.session.create({ data: input })
    return toSessionRecord(session)
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionWithUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: { select: userSelect } },
    })
    return session ? { ...toSessionRecord(session), user: toUserRecord(session.user) } : null
  }

  async touchSession(tokenHash: string, usedAt: Date): Promise<void> {
    await this.prisma.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { lastUsedAt: usedAt } })
  }

  async revokeSessionByTokenHash(tokenHash: string, revokedAt: Date): Promise<void> {
    await this.prisma.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt } })
  }
}
