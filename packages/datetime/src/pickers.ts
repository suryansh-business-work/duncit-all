import { FALLBACK_DATE_FORMAT, FALLBACK_TIME_FORMAT } from './format';

/**
 * Admin-configured patterns, translated for the MUI X date/time pickers
 * (project rule 11). The pickers are the ENTRY half of the same rule the
 * formatter covers for display: what a user types must read the same way as
 * what they are shown.
 *
 * Kept here — zero-dependency, no MUI import — so the mobile app can share the
 * clock/format core without pulling `@mui/x-date-pickers` into Metro. The
 * returned object is structurally a `Partial<AdapterFormats>`; the MUI-side
 * provider applies it.
 */

/**
 * The format tokens a MUI X v6 FIELD can split into editable sections
 * (`AdapterDateFnsBase.formatTokenMap`). date-fns understands far more — `P`,
 * `PPP`, `Q`, `w`, `X` — but a picker handed one THROWS while rendering
 * ("MUI: The token … is not supported"), which white-screens the page it sits
 * on. The admin's pattern box is free text, so it has to be checked before it
 * reaches a picker.
 */
const PICKER_TOKENS = new Set([
  'y', 'yy', 'yyy', 'yyyy',
  'M', 'MM', 'MMM', 'MMMM',
  'L', 'LL', 'LLL', 'LLLL',
  'd', 'dd', 'do',
  'E', 'EE', 'EEE', 'EEEE', 'EEEEE',
  'i', 'ii', 'iii', 'iiii',
  'e', 'ee', 'eee', 'eeee', 'eeeee', 'eeeeee',
  'c', 'cc', 'ccc', 'cccc', 'ccccc', 'cccccc',
  'a', 'aa', 'aaa',
  'H', 'HH', 'h', 'hh',
  'm', 'mm',
  's', 'ss',
]);

/** A quoted run is literal text; otherwise a token is a run of ONE letter. */
const TOKEN_SCAN = /'[^']*'|([a-zA-Z])\1*/g;

/** The date-fns tokens in a pattern, with quoted literal text skipped. */
export function formatTokens(pattern: string): string[] {
  const tokens: string[] = [];
  for (const match of pattern.matchAll(TOKEN_SCAN)) {
    if (match[1]) tokens.push(match[0]);
  }
  return tokens;
}

/** The tokens a picker field cannot parse — empty when the pattern is safe. */
export function unsupportedPickerTokens(pattern: string): string[] {
  return formatTokens(pattern).filter((token) => !PICKER_TOKENS.has(token));
}

/** True when every token in the pattern is one a picker field can edit. */
export function isPickerSafeFormat(pattern: string): boolean {
  return unsupportedPickerTokens(pattern).length === 0;
}

/**
 * The pattern to hand a picker: the admin's, unless it carries a token the
 * pickers would throw on — a saved pattern must never be able to take a page
 * down, so an unusable one degrades to the shared fallback instead. The admin
 * panel validates the same rule at save time, so this is the second gate.
 */
function pickerSafe(pattern: string | null | undefined, fallback: string): string {
  const candidate = pattern || fallback;
  if (isPickerSafeFormat(candidate)) return candidate;
  return fallback;
}

/** True when the pattern counts hours on a 12-hour clock (`h`/`hh` + meridiem). */
export function usesTwelveHourClock(timeFormat: string | null | undefined): boolean {
  return formatTokens(timeFormat || FALLBACK_TIME_FORMAT).some(
    (token) => token === 'h' || token === 'hh',
  );
}

/**
 * The subset of MUI's `AdapterFormats` that decides what a picker RENDERS.
 * Every date-bearing key gets the admin date pattern and every time-bearing key
 * the admin time pattern, including the explicit 12h/24h variants — a component
 * that hardcodes `ampm` must not be able to opt out of the admin's choice.
 * Calendar-header keys (`month`, `year`, `monthAndYear`) are deliberately left
 * alone: they label a month picker, not a date.
 */
export interface PickerFormats {
  keyboardDate: string;
  fullDate: string;
  fullDateWithWeekday: string;
  normalDate: string;
  normalDateWithWeekday: string;
  shortDate: string;
  fullTime: string;
  fullTime12h: string;
  fullTime24h: string;
  keyboardDateTime: string;
  keyboardDateTime12h: string;
  keyboardDateTime24h: string;
  fullDateTime: string;
  fullDateTime12h: string;
  fullDateTime24h: string;
}

/** Build the picker format overrides from the admin's two patterns. */
export function muiDateFormats(
  dateFormat: string | null | undefined,
  timeFormat: string | null | undefined,
): PickerFormats {
  const date = pickerSafe(dateFormat, FALLBACK_DATE_FORMAT);
  const time = pickerSafe(timeFormat, FALLBACK_TIME_FORMAT);
  const dateTime = `${date} ${time}`;
  return {
    keyboardDate: date,
    fullDate: date,
    fullDateWithWeekday: date,
    normalDate: date,
    normalDateWithWeekday: date,
    shortDate: date,
    fullTime: time,
    fullTime12h: time,
    fullTime24h: time,
    keyboardDateTime: dateTime,
    keyboardDateTime12h: dateTime,
    keyboardDateTime24h: dateTime,
    fullDateTime: dateTime,
    fullDateTime12h: dateTime,
    fullDateTime24h: dateTime,
  };
}
