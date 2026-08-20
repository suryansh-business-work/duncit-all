import {
  createDateFormatter,
  FALLBACK_DATE_FORMAT,
  FALLBACK_TIME_FORMAT,
  FALLBACK_TIME_ZONE,
  type DateFormatter,
  type DateInput,
} from './format';

/**
 * The admin's display settings, readable WITHOUT a React hook.
 *
 * `useDateFormat` covers everything rendered inside a component, but a good
 * deal of date text is produced outside one: an AG Grid `valueGetter`, a pure
 * `formatX` helper in a utils module, a column definition built by a plain
 * function. Those used to carry their own hardcoded pattern, which is how a
 * table column and the detail page it opened ended up disagreeing.
 *
 * One module-level cell, published by the provider that already reads the
 * settings, is what lets those callers share the same answer. It is a cache of
 * a server value, never a second source of truth — the hook stays the way a
 * component reads it.
 */

export interface AmbientDateSettings {
  dateFormat: string;
  timeFormat: string;
  timeZone: string;
  timeZoneAware: boolean;
}

const FALLBACK: AmbientDateSettings = {
  dateFormat: FALLBACK_DATE_FORMAT,
  timeFormat: FALLBACK_TIME_FORMAT,
  timeZone: FALLBACK_TIME_ZONE,
  timeZoneAware: false,
};

let settings: AmbientDateSettings = FALLBACK;
let formatter: DateFormatter = createDateFormatter(FALLBACK);
const listeners = new Set<() => void>();

/** Publish the admin's settings. Called by the provider that reads them. */
export function setAmbientDateSettings(next: Readonly<Partial<AmbientDateSettings>>): void {
  const resolved: AmbientDateSettings = {
    dateFormat: next.dateFormat || FALLBACK.dateFormat,
    timeFormat: next.timeFormat || FALLBACK.timeFormat,
    timeZone: next.timeZone || FALLBACK.timeZone,
    timeZoneAware: next.timeZoneAware === true,
  };
  const unchanged =
    resolved.dateFormat === settings.dateFormat &&
    resolved.timeFormat === settings.timeFormat &&
    resolved.timeZone === settings.timeZone &&
    resolved.timeZoneAware === settings.timeZoneAware;
  // Publishing happens on every render of the provider, so an unchanged value
  // must not wake subscribers — a table that refreshes its cells on notify
  // would otherwise repaint on each render.
  if (unchanged) return;
  settings = resolved;
  formatter = createDateFormatter(resolved);
  listeners.forEach((listener) => listener());
}

/** The admin's date pattern, or the shared fallback before settings land. */
export function ambientDateFormat(): string {
  return settings.dateFormat;
}

/** The admin's time pattern, or the shared fallback before settings land. */
export function ambientTimeFormat(): string {
  return settings.timeFormat;
}

/** A formatter built from the published settings; rebuilt only when they change. */
export function ambientDateFormatter(): DateFormatter {
  return formatter;
}

/** Subscribe to published changes; returns the unsubscribe. */
export function subscribeAmbientDateSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current settings object — a stable reference for `useSyncExternalStore`. */
export function ambientDateSettings(): AmbientDateSettings {
  return settings;
}

/**
 * Plain formatters over the published settings, for the callers that build date
 * text outside a component. `useDateFormat()` stays the way a component reads
 * this — these exist so a pure helper does not have to invent its own pattern.
 * Named to match the same three helpers on mWeb and native (rule 27).
 */
export function formatDate(input: DateInput): string {
  return formatter.formatDate(input);
}

export function formatTime(input: DateInput): string {
  return formatter.formatTime(input);
}

export function formatDateTime(input: DateInput): string {
  return formatter.formatDateTime(input);
}

/** A stored 'yyyy-MM-dd' calendar day — never shifted by a time zone. */
export function formatDay(value: string): string {
  return formatter.formatDay(value);
}

/** Test seam: drop back to the shared fallbacks. */
export function resetAmbientDateSettings(): void {
  settings = FALLBACK;
  formatter = createDateFormatter(FALLBACK);
  listeners.forEach((listener) => listener());
}
