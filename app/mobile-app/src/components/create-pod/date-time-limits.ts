/** Min-date/time rules for the create-pod calendar sheet.
 *
 * A chip is blocked when even its LATEST completion stays before `min`: a day
 * is out when 23:45 on it is still too early, an hour when :45 in it is, and a
 * minute when the exact composed time is. This mirrors mWeb's MUI X
 * `minDateTime` behaviour on the Tamagui sheet (rule 27).
 */

/** Last selectable chips on the sheet — hour 23, minute :45. */
const LAST_HOUR = 23;
const LAST_MINUTE = 45;

/** The date the sheet's current selection composes to (local time). */
export const composeSelection = (view: Date, day: number, hour: number, minute: number): Date =>
  new Date(view.getFullYear(), view.getMonth(), day, hour, minute);

/** True when this day cell can never reach `min`. */
export const dayBlocked = (view: Date, day: number, min: Date | null): boolean =>
  !!min && composeSelection(view, day, LAST_HOUR, LAST_MINUTE) < min;

/** True when this hour chip can never reach `min` on the selected day. */
export const hourBlocked = (view: Date, day: number, hour: number, min: Date | null): boolean =>
  !!min && composeSelection(view, day, hour, LAST_MINUTE) < min;

/** True when this minute chip composes to a time before `min`. */
export const minuteBlocked = (
  view: Date,
  day: number,
  hour: number,
  minute: number,
  min: Date | null,
): boolean => !!min && composeSelection(view, day, hour, minute) < min;

/** The sheet's opening selection: the current value, clamped up to the earliest
 * allowed time so the end sheet opens on the start's day, not today. */
export const seedFor = (initial: Date | null, min: Date | null): Date => {
  const base = initial ?? min ?? new Date();
  if (min && base < min) return min;
  return base;
};
