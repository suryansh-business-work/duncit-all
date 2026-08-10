import type { SessionDevice } from './types';

/**
 * Where the DUID is persisted, on every surface.
 *
 * The key is shared rather than per-app because it is the SAME identifier: a
 * browser that visits mWeb and then a portal is one device, and two keys would
 * count it twice.
 */
export const DUID_STORAGE_KEY = 'duncit_duid';

/** Monotonic tie-breaker for the no-Web-Crypto last resort below. */
let sequence = 0;

/**
 * Mint a device id.
 *
 * `Math.random()` is deliberately absent even though a DUID is not a secret —
 * Sonar S2245 forbids it for identifiers, and the timestamp+sequence fallback
 * is unique enough for an analytics id without it.
 */
export function makeDeviceId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  if (typeof c?.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return `duid-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  sequence += 1;
  return `duid-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

/**
 * Normalise whatever a platform probe read into the one device shape.
 *
 * Every field lands as a string, never undefined: this object is attached to
 * bug reports and log frames, and `"model": undefined` disappearing from a
 * JSON payload is how a report arrives with the handset silently missing.
 */
export function makeDevice(parts: Partial<SessionDevice>): SessionDevice {
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  return {
    duid: str(parts.duid),
    platform: str(parts.platform) || 'unknown',
    os: str(parts.os),
    model: str(parts.model),
    app_version: str(parts.app_version),
    timezone: str(parts.timezone),
  };
}

/** The device timezone, or '' where `Intl` is unavailable. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}
