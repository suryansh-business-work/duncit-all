/**
 * The look of the AI content check, in one place.
 *
 * The same three stops paint the "AI monitoring" chip on every Create Pod step
 * and the overlay the host waits behind once they press Create Pod — on mWeb
 * and on native. Four renders of one gradient is exactly the drift rule 40
 * exists to stop: the chip and the overlay have to read as the same thing, or
 * the wait looks like it belongs to some other feature.
 */

/** Violet → pink → amber, in gradient order. Native passes the tuple straight
 * to `expo-linear-gradient`. */
export const AI_MONITOR_GRADIENT: readonly [string, string, string] = [
  '#7C3AED',
  '#EC4899',
  '#F59E0B',
];

/** The same stops as a CSS value, for the MUI surfaces. */
export const AI_MONITOR_GRADIENT_CSS = `linear-gradient(120deg, ${AI_MONITOR_GRADIENT.join(', ')})`;
