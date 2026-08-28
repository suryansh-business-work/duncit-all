/**
 * The message a failed write shows.
 *
 * A thrown Error carries the server's own sentence, which is the useful one;
 * anything else has nothing to say, so the caller's localised line stands in.
 * One definition, because every write in this package refuses the same way and
 * has to word it the same way (rule 40).
 */
export const writeFailure = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;
