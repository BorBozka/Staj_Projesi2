/**
 * Turkish-aware lowercase for case-insensitive search. Plain `toLowerCase()` maps
 * "I" to "i" instead of "ı", so searching "ISTANBUL" would miss "İstanbul" and
 * vice versa. Use this whenever a substring match needs to survive dotted/dotless
 * I differences.
 */
export function foldTr(value: string): string {
  return value.toLocaleLowerCase("tr-TR")
}
