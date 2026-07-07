/** Escape a user-supplied string for safe use inside a RegExp (prevents injection/ReDoS via metachars). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
