import { useMemo } from 'react';
import { deviceTimezone, getOrCreateDuid, makeDevice, type SessionDevice } from '@duncit/user-core';

/**
 * What the app version resolves to on a surface that never defined it.
 *
 * mWeb bakes `__APP_VERSION__` in through Vite; the portals do not, and a bug
 * report that says "unknown" is honest where one that quietly says "1.0.0"
 * would send someone hunting a build that was never running.
 */
declare const __APP_VERSION__: string | undefined;

function readAppVersion(): string {
  try {
    return typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';
  } catch {
    return '';
  }
}

/**
 * The device this session is running on.
 *
 * Read once per mount and memoised: none of it changes while the tab is open,
 * and `navigator.userAgent` in a render body is a needless string build on
 * every keystroke.
 *
 * The DUID is the reason this is a hook rather than a constant — it must be
 * created on first read if the browser has none, and that touches storage.
 */
export function useDeviceInfo(): SessionDevice {
  return useMemo(() => {
    if (globalThis.window === undefined) return makeDevice({});
    const nav = globalThis.navigator;
    return makeDevice({
      duid: getOrCreateDuid(),
      platform: 'web',
      os: nav?.userAgent ?? '',
      model: `${globalThis.screen?.width ?? 0}x${globalThis.screen?.height ?? 0}`,
      app_version: readAppVersion(),
      timezone: deviceTimezone(),
    });
  }, []);
}
