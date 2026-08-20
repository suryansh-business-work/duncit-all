import type { LogClient } from './types';

/**
 * What a browser can say about itself, read fresh on every emit.
 *
 * A crash report is only as good as the state around it: the same stack trace
 * means something different on a 360px phone in Hindi on a 2g connection than
 * it does on a desktop, and neither is visible from the message. Everything
 * here is read defensively — the same module also runs under React Native,
 * where `screen`, `document` and `navigator.connection` do not exist.
 */

/** Non-standard fields real browsers ship that the DOM lib does not declare. */
interface NavigatorExtras {
  connection?: { effectiveType?: string; type?: string };
  onLine?: boolean;
  language?: string;
}

const navigatorExtras = (): NavigatorExtras | undefined =>
  typeof navigator === 'undefined' ? undefined : navigator;

/** `4g` / `wifi` / `offline` — whichever the browser is willing to admit to. */
function currentNetwork(): string | undefined {
  const nav = navigatorExtras();
  if (!nav) return undefined;
  if (nav.onLine === false) return 'offline';
  return nav.connection?.effectiveType ?? nav.connection?.type;
}

/** The IANA zone the surface is rendering in (`Asia/Kolkata`). */
function currentTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function currentScreen(): string | undefined {
  if (typeof screen === 'undefined') return undefined;
  return `${screen.width}x${screen.height}`;
}

function currentViewport(): string | undefined {
  const w = globalThis.innerWidth;
  const h = globalThis.innerHeight;
  return typeof w === 'number' && typeof h === 'number' ? `${w}x${h}` : undefined;
}

function currentReferrer(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.referrer || undefined;
}

/** Everything a browser reports about itself. Empty object off the web. */
export function browserClientInfo(): LogClient {
  return compactClient({
    locale: navigatorExtras()?.language,
    timezone: currentTimezone(),
    screen: currentScreen(),
    viewport: currentViewport(),
    network: currentNetwork(),
    referrer: currentReferrer(),
  });
}

/**
 * Drop the keys that resolved to nothing.
 *
 * The app's own `client` context is layered OVER this one, and a plain spread
 * would let an absent field there erase a field that was actually present.
 */
export function compactClient(info: LogClient): LogClient {
  const out: LogClient = {};
  for (const [key, value] of Object.entries(info)) {
    if (value !== undefined && value !== null && value !== '') {
      out[key as keyof LogClient] = value as never;
    }
  }
  return out;
}

const SESSION_STORAGE_KEY = 'duncit_log_session';

/** Fresh per tab / per app launch — never persisted beyond it. */
function mintSessionId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  // Old Safari and the RN JSC bridge have no randomUUID; the id only has to be
  // unique among the sessions open right now, so this is enough.
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let memorySessionId: string | undefined;

/**
 * The id that ties one person's run of logs together.
 *
 * Held in sessionStorage so a reload keeps the thread and a second tab starts
 * its own; native has no sessionStorage, so there it lives for the life of the
 * process — which is the same span.
 */
export function sessionId(): string {
  if (memorySessionId) return memorySessionId;
  try {
    const stored = globalThis.sessionStorage?.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      memorySessionId = stored;
      return stored;
    }
    memorySessionId = mintSessionId();
    globalThis.sessionStorage?.setItem(SESSION_STORAGE_KEY, memorySessionId);
  } catch {
    // Private-mode Safari throws on sessionStorage; the in-memory id still works.
    memorySessionId ??= mintSessionId();
  }
  return memorySessionId;
}
