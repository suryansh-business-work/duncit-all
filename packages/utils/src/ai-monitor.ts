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

/**
 * How the AI content check MOVES, in one place.
 *
 * The gradient above says the feature is AI; this says it is *awake*. A chip
 * that shimmers, a badge that breathes and a bar that scans are the same three
 * gestures wherever AI monitoring appears — beside an upload field, on a pod
 * row, and behind the wait after Create Pod — so a person learns the signal
 * once instead of per screen.
 *
 * The numbers live here for the same reason the stops do: mWeb draws them with
 * CSS keyframes and native with `Animated`, and two hand-typed sets of timings
 * drift into two different features that merely share a palette.
 */
export const AI_MONITOR_MOTION = {
  /** One pass of the shimmer over an idle chip or pill, in ms. */
  sweepMs: 2600,
  /** One breath of the badge — out to `breatheScale` and back, in ms. */
  breatheMs: 1800,
  /** A ring's whole flight, `ringFrom` → `ringTo`, in ms. */
  rippleMs: 1800,
  /** How long the scan bar takes to cross its track, in ms. */
  scanMs: 1400,
  /** One twinkle of the spark icon, in ms. */
  twinkleMs: 2600,
  /** The badge's peak size, as a multiple of its resting size. */
  breatheScale: 1.08,
  /** A ring starts this size and fades out at `ringTo`. */
  ringFrom: 0.85,
  ringTo: 1.95,
  /** Ring opacity at birth. It reaches 0 at `ringTo`. */
  ringOpacity: 0.55,
  /** How far into the first ring's flight the second one leaves, 0–1. */
  ringStagger: 0.5,
} as const;

/** One ring leaving the badge, and how long after the first it goes. */
export interface AiMonitorRing {
  readonly id: string;
  readonly delayMs: number;
}

/**
 * The rings a badge emits while the check is running: the lead ring and the
 * one half a flight behind it, so there is always one mid-air.
 *
 * Ids rather than indexes because both surfaces render this as a list and
 * rule 26a bans an array index as a React key. Typed as a fixed PAIR rather
 * than an array so native, which needs one animation driver per ring and
 * therefore reads them by position, does not have to null-check a constant.
 */
export const AI_MONITOR_RINGS: readonly [AiMonitorRing, AiMonitorRing] = [
  { id: 'ripple-lead', delayMs: 0 },
  { id: 'ripple-trail', delayMs: AI_MONITOR_MOTION.rippleMs * AI_MONITOR_MOTION.ringStagger },
];
