/**
 * Narrows a persisted string to one of a known literal union, failing loudly on an
 * unexpected value rather than letting an invalid enum flow into a projection.
 */
export function parseEnum<T extends readonly string[]>(values: T, value: string, label: string): T[number] {
  const found = values.find((item) => item === value)
  if (!found) throw new Error(`Unsupported persisted ${label}: ${value}`)
  return found
}
