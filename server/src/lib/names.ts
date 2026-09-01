/**
 * Usernames and e-mail addresses are identifiers, not display text. ASCII-style lowercase
 * preserves the existing frontend uniqueness contract and gives SQL Server a normalized value
 * with a database unique index independent of deployment collation.
 */
export function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase()
}
