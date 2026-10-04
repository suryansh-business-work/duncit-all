/**
 * A regex someone typed into a console (an automation flow's "matches"
 * condition) that the server then runs against inbound text.
 *
 * JavaScript's engine backtracks, so a pattern like `(a+)+$` takes exponential
 * time on a long enough non-matching input and pins the event loop for every
 * request (ReDoS). There is no linear-time engine in this server, so instead of
 * trusting the pattern we vet it: the shapes that backtrack catastrophically
 * are refused and the text is matched LITERALLY instead — the flow keeps
 * working, it just stops treating the string as a pattern.
 */

/** Longest pattern accepted as a regex at all. */
export const MAX_VETTED_PATTERN = 200;
/** Longest input a vetted pattern is ever run against. */
export const MAX_VETTED_INPUT = 2000;

/** The pattern as plain text — every metacharacter escaped. */
export const escapeRegexLiteral = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * A group that is itself quantified and contains a quantifier or an
 * alternation — `(a+)+`, `(a*)*`, `(\w+\s?)*`, `(a|aa)+`: the nested-ambiguity
 * shapes behind catastrophic backtracking.
 */
const QUANTIFIED_RISKY_GROUP = /\((?:[^()\\]|\\.)*(?:[+*]|\{\d+,\d*\}|\|)(?:[^()\\]|\\.)*\)\s*(?:[+*]|\{\d+,\d*\})/;
/** A backreference (`\1` … `\9`) — matching it can backtrack without bound too. */
const BACKREFERENCE = /\\[1-9]/;

/**
 * Whether a pattern's SHAPE is safe to run as a regex. Whether it compiles at
 * all is the caller's catch: compiling never backtracks, only running does.
 */
export function isVettedPattern(pattern: string): boolean {
  if (pattern.length > MAX_VETTED_PATTERN) return false;
  return !QUANTIFIED_RISKY_GROUP.test(pattern) && !BACKREFERENCE.test(pattern);
}

/** The pattern to compile: itself when it is safe, else escaped so it matches literally. */
export function vetRegexPattern(pattern: string): string {
  return isVettedPattern(pattern) ? pattern : escapeRegexLiteral(pattern);
}
