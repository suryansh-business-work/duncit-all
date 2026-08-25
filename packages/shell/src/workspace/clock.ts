/**
 * The taskbar clock's two pure decisions, kept out of the component so both are
 * testable and neither invents a format of its own — the pattern always comes
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
