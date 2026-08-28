/**
 * The message an enrolment shows when the server refused it.
 *
 * All three dialogs — venue, host, club admin — refuse the same way and must
 * word it the same way, so the decision lives here once rather than three
 * times (rule 40). A thrown Error carries the server's own sentence, which is
 * the useful one; anything else has nothing to say, so the localised
 * "somebody got there first" line stands in.
 */
export const enrolmentFailure = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;
