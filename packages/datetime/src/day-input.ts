import { format as fmtFn, parse as parseFn } from 'date-fns';

/**
 * The reverse of formatting: reading back a date a user TYPED in the admin's
 * configured pattern, and telling them what shape to type.
 *
 * mWeb and the portals get this from MUI X, which owns both halves of its
 * fields. The native app has no MUI, so its text inputs used to hardcode
 * `YYYY-MM-DD` — which is why a member typed a different shape on the phone
 * than on the web for the same box.
 *
 * Parsing is always DEVICE-LOCAL. A typed "5 Jan 2000" means that wall-clock
 * day where the person is standing; re-interpreting it in the admin's zone
 * would silently shift a birthday across the date line.
 */

/** Token → the letters shown in a placeholder, e.g. `dd` → `DD`. */
const HINT_BY_TOKEN: Record<string, string> = {
  yy: 'YY',
  yyyy: 'YYYY',
  M: 'M',
  MM: 'MM',
  MMM: 'MMM',
  MMMM: 'MMMM',
  d: 'D',
  dd: 'DD',
  do: 'DD',
  E: 'DDD',
  EEE: 'DDD',
  EEEE: 'DDDD',
  H: 'H',
  HH: 'HH',
  h: 'h',
  hh: 'hh',
  m: 'm',
  mm: 'mm',
  s: 's',
  ss: 'ss',
  a: 'AM',
  aa: 'AM',
};

const TOKEN_SCAN = /'([^']*)'|([a-zA-Z])\2*/g;

/**
 * A typing hint for a pattern — `dd MMM yyyy` reads as `DD MMM YYYY`. Unknown
 * tokens are left as written rather than dropped, so an admin using an exotic
 * pattern still sees a hint that resembles it.
 */
export function patternPlaceholder(pattern: string): string {
  return pattern.replace(
    TOKEN_SCAN,
    // A quoted run is literal text — shown without its quotes; anything else is
    // a token, shown as the letters a reader would type for it.
    (match, quoted: string | undefined) => quoted ?? HINT_BY_TOKEN[match] ?? match,
  );
}

/**
 * Parse text typed in `pattern`; null when it is not a complete, real date.
 *
 * date-fns stops at the first character it cannot place and keeps whatever it
 * read, so "5 Jan 2000 and then some" would otherwise pass. Re-formatting the
 * result and comparing back is what makes the check total — case-insensitively,
 * so "5 jan 2000" is still accepted.
 */
export function parseInPattern(
  text: string,
  pattern: string,
  reference: Date = new Date(),
): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const parsed = parseFn(trimmed, pattern, reference);
    if (Number.isNaN(parsed.getTime())) return null;
    const echoed = fmtFn(parsed, pattern);
    return echoed.toLowerCase() === trimmed.toLowerCase() ? parsed : null;
  } catch {
    return null;
  }
}

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * A Date as its LOCAL calendar day, `YYYY-MM-DD`. `toISOString` would shift the
 * day for anyone behind UTC and store a birthday one day early.
 */
export function toIsoDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a bare 'yyyy-MM-dd' calendar day (no time, no zone). */
export function isIsoDay(value: string): boolean {
  return ISO_DAY.test(value);
}

/**
 * A 'yyyy-MM-dd' calendar day as a local Date, or null when it is not one.
 *
 * A birthday is a position on a calendar, not an instant: `new Date('2000-01-05')`
 * reads it as UTC midnight, which is the 4th for every viewer behind UTC. The
 * parts are rebuilt directly so the day that comes out is the day that went in.
 */
export function parseIsoDay(value: string): Date | null {
  const parts = ISO_DAY.exec(value);
  if (!parts) return null;
  const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Render a 'yyyy-MM-dd' calendar day in `pattern`, with NO zone conversion. */
export function formatIsoDay(value: string, pattern: string): string {
  const date = parseIsoDay(value);
  if (!date) return '';
  try {
    return fmtFn(date, pattern);
  } catch {
    return '';
  }
}

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * An instant as the local `YYYY-MM-DDTHH:mm` shape, in the browser's own zone.
 *
 * It is what `<input type="datetime-local">` speaks, and several admin screens
 * keep their draft state in it — so the shape survives even though the inputs
 * are now MUI X pickers, and a "has this changed?" comparison still works.
 */
export function toLocalDateTimeInput(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The inverse: a local `YYYY-MM-DDTHH:mm` back to a Date, or null. */
export function parseLocalDateTimeInput(value: string): Date | null {
  const parts = LOCAL_DATE_TIME.exec(value);
  if (!parts) return null;
  const date = new Date(
    Number(parts[1]),
    Number(parts[2]) - 1,
    Number(parts[3]),
    Number(parts[4]),
    Number(parts[5]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}
