/**
 * The taskbar clock's pure decisions, kept out of the component so each is
 * testable and none of them invents a format of its own — the pattern always comes
 * from the admin's setting (project rule 11).
 */

/**
 * The configured time pattern, counting seconds.
 *
 * Seconds go where minutes are rather than on the end, because the end is where
 * the meridiem sits: appending to 'hh:mm a' gives 'hh:mm a:ss', which reads
 * "07:04 PM:22". Inserting after the minutes gives 'hh:mm:ss a' for a 12-hour
 * pattern and 'HH:mm:ss' for a 24-hour one, which is what both look like
 * everywhere else.
 */
export function withSeconds(pattern: string): string {
  if (pattern.includes('ss')) return pattern;
  // Non-global on purpose: only the FIRST minutes token becomes minutes+seconds.
  return pattern.replace(/m{1,2}/, (minutes) => `${minutes}:ss`);
}

/** Every zone this browser knows, or an empty list where it cannot say. */
export function supportedTimeZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  try {
    return intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    // Older engines throw on an unknown key rather than answering undefined.
    return [];
  }
}

/** The zone this machine is set to, or '' where the browser will not say. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/** A zone as the picker offers it: what it is called, and where it sits in the day. */
export interface ZoneChoice {
  /** The IANA id, e.g. 'Asia/Calcutta'. */
  value: string;
  /** Minutes east of GMT at this instant — what the list is ordered by. */
  offset: number;
  /** The offset written out and padded, e.g. 'GMT+05:30'. */
  gmt: string;
  /** What the engine calls it: 'IST' where it has an abbreviation, else 'India Standard Time'. */
  name: string;
}

/** 'GMT+5:30' / 'GMT-4' / 'GMT' — every shape `shortOffset` produces. */
const GMT_OFFSET = /GMT([+-])(\d{1,2})(?::(\d{2}))?/;

/**
 * The zone part of a formatted instant, in the DEVICE's language.
 *
 * The reader's console language is not the question here — the abbreviation is:
 * ICU only knows 'IST' for a reader whose locale is Indian, and answers
 * 'GMT+5:30' for everyone else. The machine's own locale is the closest thing
 * to "how this reader writes zones", and it costs no hard-coded list.
 */
function zoneNamePart(zone: string, style: 'short' | 'shortOffset' | 'long', at: Date): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone: zone,
      timeZoneName: style,
    }).formatToParts(at);
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    // A zone the engine enumerated but cannot format is not worth a broken row.
    return '';
  }
}

/** Minutes east of GMT, read back out of a formatted 'GMT+5:30'. */
function offsetMinutes(shortOffset: string): number {
  const match = GMT_OFFSET.exec(shortOffset);
  // 'GMT' and 'UTC' are the zero offset, written without one.
  if (!match) return 0;
  // match[2] is mandatory in the pattern above — only the minutes group is
  // optional, for a whole-hour offset like 'GMT+14'.
  const total = Number.parseInt(match[2], 10) * 60 + Number.parseInt(match[3] ?? '0', 10);
  return match[1] === '-' ? -total : total;
}

/** 'GMT+05:30' — padded, so the list sorts and reads like every other zone picker. */
export function formatGmtOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const size = Math.abs(minutes);
  const hours = String(Math.floor(size / 60)).padStart(2, '0');
  const rest = String(size % 60).padStart(2, '0');
  return `GMT${sign}${hours}:${rest}`;
}

/** One zone, described: its offset now and the name the engine has for it. */
export function describeZone(zone: string, at: Date = new Date()): ZoneChoice {
  const short = zoneNamePart(zone, 'short', at);
  // 'short' answers with the offset again for a zone this engine has no
  // abbreviation for — in that case the long name says more than 'GMT+2' twice.
  const abbreviated = short !== '' && !short.startsWith('GMT') && !short.startsWith('UTC');
  const offset = offsetMinutes(zoneNamePart(zone, 'shortOffset', at));
  return {
    value: zone,
    offset,
    gmt: formatGmtOffset(offset),
    name: abbreviated ? short : zoneNamePart(zone, 'long', at),
  };
}

/*
  Describing four hundred zones costs three Intl formatters each, so it is done
  ONCE per session rather than per render: the tray re-renders every second the
  clock ticks, and DST does not move inside a sitting.
*/
let described: ZoneChoice[] | null = null;

/** Every zone this browser knows, offset-first — the order a GMT list is read in. */
export function zoneChoices(): ZoneChoice[] {
  described ??= supportedTimeZones()
    .map((zone) => describeZone(zone))
    .sort((a, b) => a.offset - b.offset || a.value.localeCompare(b.value));
  return described;
}
