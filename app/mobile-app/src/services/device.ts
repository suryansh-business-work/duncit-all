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
