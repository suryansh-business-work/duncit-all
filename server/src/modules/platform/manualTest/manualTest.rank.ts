/**
 * Fractional ranks: the order of cards inside a board column.
 *
 * A card's position is a string, and the column sorts on it as plain text. A
 * move then writes ONE document — the moved card gets a rank strictly between
 * its new neighbours — instead of renumbering every card below it, which would
 * turn every drag into a write storm and every two concurrent drags into a
 * lost update.
 *
 * The scheme is the published "fractional indexing" one (an integer part whose
 * length is encoded by its first character, then a fraction): appending at the
 * end increments the integer, so a column that only ever grows at the bottom
 * keeps short keys; only inserting between two neighbours grows the fraction.
 * Base 62 in ASCII order, so Mongo's binary string order and JavaScript's `<`
 * agree with the order the keys were generated in.
 */

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ZERO = DIGITS[0];
const LAST = DIGITS[DIGITS.length - 1];
/** The smallest integer part there is — nothing sorts below it. */
const SMALLEST_INTEGER = `A${ZERO.repeat(26)}`;

const invalid = (key: string) => new Error(`Invalid rank: ${key}`);

/** How long the integer part is, from its first character ('a' → 2 … 'z' → 27, 'Z' → 2 … 'A' → 27). */
function integerLength(head: string): number {
  if (head >= 'a' && head <= 'z') return head.charCodeAt(0) - 'a'.charCodeAt(0) + 2;
  if (head >= 'A' && head <= 'Z') return 'Z'.charCodeAt(0) - head.charCodeAt(0) + 2;
  throw invalid(head);
}

function integerPart(key: string): string {
  const length = integerLength(key[0]);
  if (length > key.length) throw invalid(key);
  return key.slice(0, length);
}

function assertRank(key: string): void {
  if (key === SMALLEST_INTEGER) throw invalid(key);
  const integer = integerPart(key);
  if (key.slice(integer.length).endsWith(ZERO)) throw invalid(key);
}

/** A digit string strictly between two fractions (`b` null for "no upper bound"). */
function midpoint(a: string, b: string | null): string {
  if (b !== null) {
    // Skip the common prefix; `a` reads as zeros once it runs out.
    let n = 0;
    while ((a[n] ?? ZERO) === b[n]) n += 1;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const digitA = a ? DIGITS.indexOf(a[0]) : 0;
  const digitB = b === null ? DIGITS.length : DIGITS.indexOf(b[0]);
  if (digitB - digitA > 1) return DIGITS[Math.round((digitA + digitB) / 2)];
  // Consecutive first digits: keep b's first digit when b goes on, else a's and recurse.
  if (b !== null && b.length > 1) return b.slice(0, 1);
  return DIGITS[digitA] + midpoint(a.slice(1), null);
}

/** Carry or borrow through the digits of an integer part; null when it overflows its length. */
function stepDigits(digits: string[], up: boolean): boolean {
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    const next = DIGITS.indexOf(digits[i]) + (up ? 1 : -1);
    if (next >= 0 && next < DIGITS.length) {
      digits[i] = DIGITS[next];
      return true;
    }
    digits[i] = up ? ZERO : LAST;
  }
  return false;
}

function incrementInteger(integer: string): string | null {
  const [head, ...digits] = integer.split('');
  if (stepDigits(digits, true)) return head + digits.join('');
  if (head === 'Z') return `a${ZERO}`;
  if (head === 'z') return null;
  const nextHead = String.fromCharCode(head.charCodeAt(0) + 1);
  if (nextHead > 'a') digits.push(ZERO);
  else digits.pop();
  return nextHead + digits.join('');
}

function decrementInteger(integer: string): string | null {
  const [head, ...digits] = integer.split('');
  if (stepDigits(digits, false)) return head + digits.join('');
  if (head === 'a') return `Z${LAST}`;
  if (head === 'A') return null;
  const nextHead = String.fromCharCode(head.charCodeAt(0) - 1);
  if (nextHead < 'Z') digits.push(LAST);
  else digits.pop();
  return nextHead + digits.join('');
}

/** A rank sorting before `b`. */
function rankBefore(b: string): string {
  const integer = integerPart(b);
  const fraction = b.slice(integer.length);
  if (integer === SMALLEST_INTEGER) return integer + midpoint('', fraction);
  if (integer < b) return integer;
  const lower = decrementInteger(integer);
  if (lower === null) throw new Error('Rank space exhausted');
  return lower;
}

/** A rank sorting after `a`. */
function rankAfter(a: string): string {
  const integer = integerPart(a);
  const higher = incrementInteger(integer);
  return higher ?? integer + midpoint(a.slice(integer.length), null);
}

/**
 * A rank strictly between `a` and `b`. `a` null means "before everything",
 * `b` null "after everything"; both null is the first card of an empty column.
 */
export function rankBetween(a: string | null, b: string | null): string {
  if (a !== null) assertRank(a);
  if (b !== null) assertRank(b);
  if (a !== null && b !== null && a >= b) throw new Error(`Rank ${a} is not before ${b}`);
  if (a === null) return b === null ? `a${ZERO}` : rankBefore(b);
  if (b === null) return rankAfter(a);
  const integerA = integerPart(a);
  const integerB = integerPart(b);
  if (integerA === integerB) {
    return integerA + midpoint(a.slice(integerA.length), b.slice(integerB.length));
  }
  const higher = incrementInteger(integerA);
  if (higher !== null && higher < b) return higher;
  return integerA + midpoint(a.slice(integerA.length), null);
}

/** `count` ascending ranks after `a` — for cards appended to a column in one go. */
export function ranksAfter(a: string | null, count: number): string[] {
  const out: string[] = [];
  let previous = a;
  for (let i = 0; i < count; i += 1) {
    previous = rankBetween(previous, null);
    out.push(previous);
  }
  return out;
}
