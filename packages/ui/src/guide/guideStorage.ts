/**
 * The guide kit's one window on localStorage.
 *
 * Storage can be blocked (a private window, a strict policy, a full quota),
 * and every one of those throws on access. A remembered "steps collapsed" or
 * "tour shown" is a convenience, so the failure costs the memory and nothing
 * else: the page renders exactly as it would on a first visit.
 */

/** The stored value, or null when nothing is stored or storage is unreachable. */
export function readGuideFlag(key: string): string | null {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Whether the value was stored. False means the choice lasts this visit only. */
export function writeGuideFlag(key: string, value: string): boolean {
  try {
    globalThis.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
