/** 1 Jan 2023 was a Sunday, so day `n` of that week is weekday `n` — the server's 0-6, Sunday first. */
const SUNDAY = Date.UTC(2023, 0, 1);
const DAY_MS = 86_400_000;
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** The seven weekdays named in the reader's language — `Intl` knows them, so no copy is shipped for them. */
export function weekdayOptions(locale: string): Array<{ value: number; label: string }> {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  return WEEKDAYS.map((value) => ({ value, label: format.format(new Date(SUNDAY + value * DAY_MS)) }));
}
