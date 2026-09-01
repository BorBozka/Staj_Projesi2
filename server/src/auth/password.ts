import argon2 from "argon2"

const passwordOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const

export function hashPassword(plainTextPassword: string): Promise<string> {
  return argon2.hash(plainTextPassword, passwordOptions)
}

export function verifyPassword(passwordHash: string, plainTextPassword: string): Promise<boolean> {
  return argon2.verify(passwordHash, plainTextPassword)
}
