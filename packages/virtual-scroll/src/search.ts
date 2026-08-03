/**
 * Free-text list filtering shared by the mWeb and native pod lists, so both
 * surfaces match the exact same items for the same query (rule 27).
 */

const COMBINING_FIRST = 0x300;
const COMBINING_LAST = 0x36f;

/** Lowercase + strip combining diacritics, so "Café" matches "cafe". */
function fold(value: string): string {
  let out = '';
  for (const char of value.toLowerCase().normalize('NFKD')) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (codePoint < COMBINING_FIRST || codePoint > COMBINING_LAST) out += char;
  }
  return out;
}

/** True when every whitespace-separated token of `query` appears in `parts`. */
export function matchesQuery(
  parts: ReadonlyArray<string | null | undefined>,
  query: string,
): boolean {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = fold(parts.filter(Boolean).join(' '));
  return tokens.every((token) => haystack.includes(token));
}

/** Filter `items` by a free-text query; empty/whitespace queries keep all. */
export function filterByQuery<T>(
  items: readonly T[],
  query: string,
  textOf: (item: T) => ReadonlyArray<string | null | undefined>,
): T[] {
  if (query.trim() === '') return [...items];
  return items.filter((item) => matchesQuery(textOf(item), query));
}
