/**
 * A screen's name from a URL path, so `/pods/6650…/join` and `/pods/6651…/join`
 * are one screen (`/pods/:id/join`) rather than one per pod. A segment is an id
 * when it is a Mongo ObjectId, a UUID, a number, or a long token holding digits
 * (a share code, a DUID). The native app names screens by route instead and
 * never needs this.
 */

const HEX = new Set('0123456789abcdefABCDEF');
const MAX_SCREEN_NAME = 120;
/** A slug this long that still holds a digit is an id, not a word. */
const LONG_TOKEN = 16;

const allOf = (text: string, test: (char: string) => boolean) => [...text].every(test);
const isDigit = (char: string) => char >= '0' && char <= '9';

function isUuid(segment: string): boolean {
  if (segment.length !== 36) return false;
  return [...segment].every((char, index) => ([8, 13, 18, 23].includes(index) ? char === '-' : HEX.has(char)));
}

export function isIdSegment(segment: string): boolean {
  if (segment.length === 24 && allOf(segment, (char) => HEX.has(char))) return true;
  if (isUuid(segment)) return true;
  if (allOf(segment, isDigit)) return true;
  return segment.length >= LONG_TOKEN && [...segment].some(isDigit);
}

export function screenNameFromPath(path: string): string {
  // Everything before the first ? or #; join keeps it a string with no branch to cover.
  const bare = path.split(/[?#]/, 1).join('');
  const segments = bare.split('/').filter(Boolean).map((segment) => (isIdSegment(segment) ? ':id' : segment));
  return `/${segments.join('/')}`.slice(0, MAX_SCREEN_NAME);
}
