import { Platform } from 'react-native';
import { DUID_STORAGE_KEY, deviceTimezone, makeDevice, makeDeviceId } from '@duncit/user-core';
import type { SessionDevice } from '@duncit/user-core';

import { getItem, setItem } from '@/services/secure-storage';
import { appVersion } from '@/utils/app-version';

/**
 * The DUID, cached for the process.
 *
 * Every GraphQL request sends it as `x-duid`, and reading the Keychain on each
 * one would put a native bridge round trip in front of every call. The value
 * cannot change while the app is running, so one read is enough.
 */
let duidCache: string | null = null;
let duidInFlight: Promise<string> | null = null;

async function readOrCreateDuid(): Promise<string> {
  const existing = await getItem(DUID_STORAGE_KEY);
  if (existing) return existing;
  const fresh = makeDeviceId();
  await setItem(DUID_STORAGE_KEY, fresh);
  return fresh;
}

/**
 * This install's device id — the same identifier, key and shape the web uses.
 *
 * Native had none at all, so every request from the app arrived without
 * `x-duid` and no app session ever counted toward `unique_devices`.
 *
 * Concurrent callers share one in-flight read: the first few requests after
 * launch fire together, and without this each would mint its own id and the
 * last write would win.
 */
export async function getDuid(): Promise<string> {
  if (duidCache) return duidCache;
  duidInFlight ??= readOrCreateDuid()
    .then((id) => {
      duidCache = id;
      return id;
    })
    .catch(() => {
      // Keychain unavailable (a locked device on first launch). Returning ''
      // omits the header rather than sending an id that will not persist.
      duidInFlight = null;
      return '';
    });
  return duidInFlight;
}

/**
 * The DUID if it has already been read, without waiting for the Keychain.
 *
 * For callers that cannot be async — the log transport builds its headers
 * synchronously. The first GraphQL call of the launch fills the cache, so in
 * practice everything after the opening moments carries the id; a log written
 * before that simply goes without one, which beats holding up the log.
 */
export function cachedDuid(): string | null {
  return duidCache;
}

/**
 * The handset model.
 *
 * `Platform.constants` is typed as an iOS/Android union and only the Android
 * arm declares `Model`/`Brand`, so it is read through a record — the value is
 * a display string for bug reports, and narrowing the union per platform would
 * be ceremony for one label.
 */
function deviceModel(): string {
  const constants = Platform.constants as unknown as Record<string, unknown> | undefined;
  const model = constants?.Model ?? constants?.Brand ?? constants?.systemName;
  return typeof model === 'string' ? model : '';
}

/**
 * The machine facts every log carries.
 *
 * A browser reads its own locale, screen and network; native cannot, so the
 * app reports what it does know. Synchronous by necessity — the log funnel
 * resolves this on every emit and cannot await the Keychain.
 */
export function logClientInfo(): {
  app_version: string;
  device_model: string;
  device_os_version: string;
  timezone: string;
} {
  return {
    app_version: appVersion(),
    device_model: deviceModel(),
    device_os_version: String(Platform.Version ?? ''),
    timezone: deviceTimezone(),
  };
}

/** The device this session runs on — the native twin of `useDeviceInfo()`. */
export async function readDevice(): Promise<SessionDevice> {
  return makeDevice({
    duid: await getDuid(),
    platform: Platform.OS,
    os: [Platform.OS, String(Platform.Version ?? '')].filter(Boolean).join(' '),
    model: deviceModel(),
    app_version: appVersion(),
    timezone: deviceTimezone(),
  });
}
