import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/** Minutes after midnight for 'HH:mm', or null when it is not a valid clock time. '24:00' is the day's end. */
export function clockMinutes(hhmm: string | null | undefined): number | null {
  const parts = (hhmm ?? '').split(':');
  if (parts.length !== 2 || parts[0].length !== 2 || parts[1].length !== 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isInteger(h) || !Number.isInteger(m) || m < 0 || m > 59 || h < 0) return null;
  if (h > 24 || (h === 24 && m !== 0)) return null;
  return h * 60 + m;
}

/** The local calendar day, weekday and minutes-after-midnight of an instant in `timeZone`. */
export function localParts(at: Date, timeZone: string) {
  const ymd = formatInTimeZone(at, timeZone, 'yyyy-MM-dd');
  // ISO weekday 1..7 (Mon..Sun) → 0..6 (Sun..Sat).
  const weekday = Number(formatInTimeZone(at, timeZone, 'i')) % 7;
  const minutes = Number(formatInTimeZone(at, timeZone, 'H')) * 60 + Number(formatInTimeZone(at, timeZone, 'm'));
  return { ymd, weekday, minutes };
}

/** The instant of a local 'YYYY-MM-DD' + minutes-after-midnight in `timeZone`. */
export function localInstant(ymd: string, minutes: number, timeZone: string): Date {
  const midnight = fromZonedTime(`${ymd}T00:00:00`, timeZone);
  return new Date(midnight.getTime() + minutes * 60_000);
}

/** Weekday (0 = Sunday) of a 'YYYY-MM-DD' — calendar arithmetic, zone-free. */
export function weekdayOfYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** True for a real 'YYYY-MM-DD' calendar date. */
export function isYmd(value: string | null | undefined): value is string {
  if (value?.length !== 10 || value[4] !== '-' || value[7] !== '-') return false;
  const [y, m, d] = value.split('-').map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  const at = new Date(Date.UTC(y, m - 1, d));
  return at.getUTCFullYear() === y && at.getUTCMonth() === m - 1 && at.getUTCDate() === d;
}

/** Every 'YYYY-MM-DD' from `from` to `to`, inclusive. */
export function ymdRange(from: string, to: string): string[] {
  const out: string[] = [];
  const [y, m, d] = from.split('-').map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  const end = to;
  for (let i = 0; i < 400; i += 1) {
    const ymd = cursor.toISOString().slice(0, 10);
    if (ymd > end) break;
    out.push(ymd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
