/** Calendar days on the admin time zone's own clock. */

const isClockPart = <K extends string>(type: string, parts: Record<K, number>): type is K => type in parts;

/** How far `timeZone` is ahead of UTC at `at`, in ms. An unknown zone (the
 * admin's box is free text) reads as UTC rather than throwing. */
function zoneOffsetMs(at: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(at);
    const p = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
    for (const part of parts) if (isClockPart(part.type, p)) p[part.type] = Number(part.value);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUtc - Math.floor(at.getTime() / 1000) * 1000;
  } catch {
    return 0;
  }
}

/**
 * The first moment (local midnight) of calendar day `ymd` in `timeZone`, as
 * epoch ms — what a venue's booking grid counts its minutes from. NaN for a
 * value that is not a calendar day.
 */
export function startOfDayInZone(ymd: string, timeZone: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return Number.NaN;
  const wall = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return wall - zoneOffsetMs(new Date(wall), timeZone);
}
