/**
 * The application clock.
 *
 * Every surface (mobile, mWeb, every portal) reads "now" from here instead of
 * calling `Date.now()` directly, so the admin's chosen time source applies
 * everywhere identically — including the occasion icons that switch on date.
 */

/** Where "now" comes from, chosen by the admin. */
export type TimeSource = 'SERVER' | 'BROWSER' | 'CUSTOM';

export const TIME_SOURCES: readonly TimeSource[] = ['SERVER', 'BROWSER', 'CUSTOM'];

export const DEFAULT_TIME_SOURCE: TimeSource = 'SERVER';

/** Narrow an untrusted string to a TimeSource, falling back to the default. */
export function toTimeSource(value: string | null | undefined): TimeSource {
  return TIME_SOURCES.includes(value as TimeSource) ? (value as TimeSource) : DEFAULT_TIME_SOURCE;
}

/** Milliseconds since epoch, or null when the input is not a usable instant. */
export function toEpochMs(value: string | number | Date | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export interface ClockInput {
  source: TimeSource;
  /** Server's `now` from the settings response (ISO). */
  serverNow?: string | number | Date | null;
  /** Real device time when that response was received (Date.now()). */
  serverNowReceivedAt?: number | null;
  /** Admin's custom anchor instant (ISO) — CUSTOM source only. */
  customTime?: string | number | Date | null;
  /** Server's real time when the anchor was saved (ISO) — CUSTOM source only. */
  customTimeSetAt?: string | number | Date | null;
  /** Injectable real clock; defaults to Date.now. Tests pass their own. */
  realNow?: () => number;
}

/**
 * Resolve the current instant (ms) for the configured source.
 *
 * - BROWSER — the device's own clock.
 * - SERVER  — the server's clock, kept ticking by adding the real time elapsed
 *   since the settings response arrived (so it never freezes between fetches).
 * - CUSTOM  — the admin's anchor plus however long the SERVER clock has moved
 *   since the anchor was saved. Elapsed time is measured on the server clock so
 *   every device agrees, no matter how wrong its own clock is.
 *
 * Any source falls back to the device clock when its inputs are missing, so a
 * misconfigured setting can never render an empty or 1970 date.
 */
export function resolveNow(input: Readonly<ClockInput>): number {
  const realNow = input.realNow ?? Date.now;
  const deviceNow = realNow();
  if (input.source === 'BROWSER') return deviceNow;

  const serverNowMs = toEpochMs(input.serverNow);
  const receivedAt = input.serverNowReceivedAt;
  const serverLive =
    serverNowMs === null || receivedAt === null || receivedAt === undefined
      ? null
      : serverNowMs + (deviceNow - receivedAt);

  if (input.source === 'SERVER') return serverLive ?? deviceNow;

  const customMs = toEpochMs(input.customTime);
  const setAtMs = toEpochMs(input.customTimeSetAt);
  if (customMs === null) return serverLive ?? deviceNow;
  // Without a save-stamp the anchor is frozen; with one it ticks forward.
  if (setAtMs === null) return customMs;
  const reference = serverLive ?? deviceNow;
  return customMs + (reference - setAtMs);
}

// Single-entry cache: the device time at which the CURRENT server stamp was
// first seen. Kept outside React so plain functions, hooks and native stores
// all share it — and so it survives re-renders, which is what lets the server
// clock tick forward between fetches instead of freezing.
let lastServerTime: string | null = null;
let lastReceivedAt = 0;

/**
 * Device time when this `server_time` value first arrived. Returns null when
 * there is no server stamp yet, which makes the clock fall back to the device.
 */
export function stampServerTime(
  serverTime: string | null | undefined,
  realNow: () => number = Date.now,
): number | null {
  if (!serverTime) return null;
  if (serverTime !== lastServerTime) {
    lastServerTime = serverTime;
    lastReceivedAt = realNow();
  }
  return lastReceivedAt;
}

/** Test seam: forget the cached stamp. */
export function resetServerTimeStamp(): void {
  lastServerTime = null;
  lastReceivedAt = 0;
}

export interface Clock {
  /** Current instant in ms, per the configured source. */
  nowMs: () => number;
  /** Current instant as a Date. */
  now: () => Date;
  source: TimeSource;
}

/** Build a Clock from resolved settings. */
export function createClock(input: Readonly<ClockInput>): Clock {
  return {
    source: input.source,
    nowMs: () => resolveNow(input),
    now: () => new Date(resolveNow(input)),
  };
}
