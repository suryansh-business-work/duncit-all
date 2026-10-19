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

/** An unbounded range quantifier, `{n,}` or `{n,m}`, tried at one position (sticky). */
const OPEN_RANGE = /\{\d+,\d*\}/y;
/** What makes a group quantified: optional whitespace, then `+`, `*` or an unbounded range (sticky). */
const QUANTIFIER_AFTER = /\s*(?:[+*]|\{\d+,\d*\})/y;
/** The characters an escape (`\` + one character) cannot pair with — what `.` never matches. */
const LINE_TERMINATORS = new Set(['\n', '\r', ' ', ' ']);
/** A backreference (`\1` … `\9`) — matching it can backtrack without bound too. */
const BACKREFERENCE = /\\[1-9]/;

function matchesAt(sticky: RegExp, text: string, at: number): boolean {
  sticky.lastIndex = at;
  return sticky.test(text);
}

/** A quantifier (`+`, `*`, `{n,}`, `{n,m}`) or an alternation `|` starting at `at`. */
function isRepeatOrChoiceAt(pattern: string, at: number): boolean {
  const char = pattern[at];
  if (char === '+' || char === '*' || char === '|') return true;
  return char === '{' && matchesAt(OPEN_RANGE, pattern, at);
}

/**
 * The innermost group opening at `open` (its body holds no unescaped
 * parenthesis): where it closes, and whether its body repeats or alternates.
 * Null when no such group starts there.
 */
function innermostGroupAt(pattern: string, open: number): { close: number; risky: boolean } | null {
  let risky = false;
  let at = open + 1;
  while (at < pattern.length) {
    const char = pattern[at];
    if (char === ')') return { close: at, risky };
    if (char === '(') return null;
    if (char === '\\') {
      // An escape is the backslash and the one character after it, never a line end.
      const escaped = pattern[at + 1];
      if (escaped === undefined || LINE_TERMINATORS.has(escaped)) return null;
      at += 2;
    } else {
      risky ||= isRepeatOrChoiceAt(pattern, at);
      at += 1;
    }
  }
  return null;
}

/**
 * A group that is itself quantified and contains a quantifier or an
 * alternation — `(a+)+`, `(a*)*`, `(\w+\s?)*`, `(a|aa)+`: the nested-ambiguity
 * shapes behind catastrophic backtracking. A single forward walk per `(`, so
 * the check itself never backtracks.
 */
function hasQuantifiedRiskyGroup(pattern: string): boolean {
  for (let open = pattern.indexOf('('); open !== -1; open = pattern.indexOf('(', open + 1)) {
    const group = innermostGroupAt(pattern, open);
    if (group?.risky && matchesAt(QUANTIFIER_AFTER, pattern, group.close + 1)) return true;
  }
  return false;
}

/**
 * Whether a pattern's SHAPE is safe to run as a regex. Whether it compiles at
 * all is the caller's catch: compiling never backtracks, only running does.
 */
export function isVettedPattern(pattern: string): boolean {
  if (pattern.length > MAX_VETTED_PATTERN) return false;
  return !hasQuantifiedRiskyGroup(pattern) && !BACKREFERENCE.test(pattern);
}

/** The pattern to compile: itself when it is safe, else escaped so it matches literally. */
export function vetRegexPattern(pattern: string): string {
  return isVettedPattern(pattern) ? pattern : escapeRegexLiteral(pattern);
}
