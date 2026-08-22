import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * `new RegExp(userInput)` compiles the caller's string as a PATTERN. Four
 * services did exactly that on a search field, so `.*` returned every row and a
 * crafted input could pin the event loop against the collection (regex
 * injection / ReDoS).
 *
 * They are fixed, and `escapedSearchRegex` in table-query.ts is the one
 * implementation. This test is what stops the fifth one from being written: it
 * fails on any RegExp built from something that is not a literal or an escaped
 * value, so the guard costs nothing to keep and cannot be forgotten.
 */
const SERVER_SRC = path.resolve(__dirname, '../../..');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '__tests__']);

/**
 * Every `new RegExp(...)` in `source`, as the whole line it sits on.
 *
 * The line — not a parsed argument — is deliberate. The escaping idiom in this
 * codebase is `filter.search.replace(/[.*+?^${}()|[\]\]/g, …)`, whose character
 * class contains unbalanced-looking parens inside a regex literal; any
 * paren-counting parser reads that as the end of the argument and reports a
 * false positive on code that is perfectly safe. Matching the line is coarser
 * but has no such failure mode, and this is a guard, not a compiler.
 */
/**
 * How many wrapped lines of one call to absorb. Prettier splits a long
 * `new RegExp(pattern, flags)` over a handful of lines at most.
 */
const MAX_CONTINUATION_LINES = 3;

function regexLines(source: string): { line: number; text: string }[] {
  const lines = source.split('\n').map((text) => text.trim());
  const found: { line: number; text: string }[] = [];
  lines.forEach((text, index) => {
    if (!text.includes('new RegExp(') || text.startsWith('//') || text.startsWith('*')) return;
    // Prettier wraps a long call, which leaves a bare `new RegExp(` on this line
    // and the escaping idiom on the NEXT one — reported as an offender though
    // the value was escaped (prompt.service and staffChat.links both were).
    // Follow the wrap: absorb lines while the statement is plainly unfinished.
    let statement = text;
    for (let i = 1; i <= MAX_CONTINUATION_LINES; i += 1) {
      if (!/[(,]$/.test(statement)) break;
      const next = lines[index + i];
      if (next === undefined) break;
      statement += ` ${next}`;
    }
    found.push({ line: index + 1, text: statement });
  });
  return found;
}

/**
 * Safe when the pattern is a literal, or the line shows the input being escaped
 * — an escaping helper, a String.raw template, or the inline `.replace(...)`
 * idiom. Anything else is a raw value being compiled as a pattern.
 */
function isSafeLine(text: string): boolean {
  if (/new RegExp\(\s*['"`/]/.test(text)) return true;
  if (text.includes('String.raw')) return true;
  if (text.includes('.replace(')) return true;
  return /escape/i.test(text);
}

function tsFilesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      tsFilesUnder(full, out);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('no RegExp is built from unescaped input', () => {
  const files = tsFilesUnder(SERVER_SRC);

  it('scans a realistic number of files — a broken walker would pass vacuously', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('finds the RegExp calls it is meant to police', () => {
    const total = files.reduce(
      (count, file) => count + regexLines(readFileSync(file, 'utf8')).length,
      0,
    );
    expect(total).toBeGreaterThan(10);
  });

  it('rejects a raw value and accepts each escaping idiom in use here', () => {
    expect(isSafeLine("q.name = new RegExp(filter.search, 'i');")).toBe(false);
    expect(isSafeLine("{ club_name: new RegExp(filter.search, 'i') }")).toBe(false);
    expect(isSafeLine("const rx = new RegExp('^abc$', 'i');")).toBe(true);
    expect(isSafeLine('new RegExp(String.raw`\\d+`, "g")')).toBe(true);
    expect(isSafeLine('const rx = escapedSearchRegex(filter.search);')).toBe(true);
    expect(isSafeLine("const r = new RegExp(escapeRegex(word), 'i');")).toBe(true);
    expect(
      isSafeLine("new RegExp(filter.search.replace(/[.*+?^${}()|[\\]\\\\]/g, String.raw`\\$&`), 'i')"),
    ).toBe(true);
  });

  it('follows a wrapped call, so escaping on the next line still counts', () => {
    const wrapped = [
      'const rx = new RegExp(',
      '  filter.search.replaceAll(/[.*+?^${}()|[\\]\\\\]/g, String.raw`\\$&`),',
      "  'i',",
      ');',
    ].join('\n');
    const [safe] = regexLines(wrapped);
    expect(safe.line).toBe(1);
    expect(isSafeLine(safe.text)).toBe(true);

    // Wrapping must not become a way to smuggle a raw value past the guard.
    const raw = ['const rx = new RegExp(', '  filter.search,', "  'i',", ');'].join('\n');
    expect(isSafeLine(regexLines(raw)[0].text)).toBe(false);
  });

  it('has no unescaped construction anywhere in server/src', () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const { line, text } of regexLines(readFileSync(file, 'utf8'))) {
        if (!isSafeLine(text)) {
          offenders.push(`${path.relative(SERVER_SRC, file)}:${line} -> ${text}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
