import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import {
  accountEmail,
  accountName,
  can as canRoles,
  canAny as canAnyRoles,
  initials as deriveInitials,
  makeDevice,
  normalizeMe,
  subscribeUserChanged,
  type SessionDevice,
  type SessionSnapshot,
} from '@duncit/user-core';

import { config } from '@/constants/config';
import { getAuthToken } from '@/services/auth-token';
import { readDevice } from '@/services/device';
import { useFeatureFlagsStore } from '@/stores/feature-flags.store';
import { patchMe, useMeStore } from '@/stores/me.store';

const BLANK_DEVICE = makeDevice({});

/**
 * The device, read once for the whole app.
 *
 * Module-level rather than per-hook: `readDevice()` touches the Keychain for
 * the DUID, and a screen that mounts three components that each want the
 * session should not queue three secure-store reads.
 */
let devicePromise: Promise<SessionDevice> | null = null;
let deviceCache: SessionDevice | null = null;

function useDevice(): SessionDevice {
  const [device, setDevice] = useState<SessionDevice>(() => deviceCache ?? BLANK_DEVICE);
  useEffect(() => {
    if (deviceCache) return undefined;
    let alive = true;
    devicePromise ??= readDevice();
    devicePromise
      .then((next) => {
        deviceCache = next;
        if (alive) setDevice(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return device;
}

/**
 * Keep this install in step with the account's other surfaces.
 *
 * A name or language changed on the web lands here without a refetch, which is
 * what makes one shared context worth having rather than three that drift.
 */
function useUserRealtime(userId: string, apply: (patch: Record<string, unknown>) => void): void {
  useEffect(() => {
    if (!userId) return undefined;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    getAuthToken()
      .then((token) => {
        if (!token || disposed) return;
        const socket = io(config.apiUrl, {
          path: '/socket.io',
          auth: { token },
          // Same fallback as the chat sockets: some mobile and captive networks
          // block WebSockets outright.
          transports: ['websocket', 'polling'],
        });
        const off = subscribeUserChanged(socket, userId, apply);
        cleanup = () => {
          off();
          socket.disconnect();
        };
        if (disposed) cleanup();
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      cleanup?.();
    };
    // `apply` is a stable store action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}

/**
 * The one hook the app reads the session through — the native twin of mWeb's
 * `useSession()` from `@duncit/app-settings` (rule 27).
 *
 * `useMeStore` still holds the raw `me` for the screens that need fields
 * outside the shared shape (saved pods). This answers the question the other
 * forty call sites ask: who is signed in, on what device, with which roles and
 * flags — with the name/initials/role derivations resolved once instead of
 * re-guessed per screen.
 */
export function useSession(): SessionSnapshot {
  const raw = useMeStore((s) => s.data?.me);
  const isLoading = useMeStore((s) => s.isLoading);
  const error = useMeStore((s) => s.error);
  const flagRows = useFeatureFlagsStore((s) => s.data?.publicFeatureFlags);
  const device = useDevice();

  const user = useMemo(() => normalizeMe(raw), [raw]);
  useUserRealtime(user?.user_id ?? '', patchMe);

  return useMemo(() => {
    const roles = user?.roles ?? [];
    const flags: Record<string, boolean> = {};
    for (const row of flagRows ?? []) flags[row.key] = row.enabled === true;

    let status: SessionSnapshot['status'] = 'anonymous';
    if (user) status = 'authenticated';
    else if (isLoading) status = 'loading';
    else if (error) status = 'failed';

    return {
      status,
      user,
      device,
      flags,
      isAuthenticated: !!user,
      roles,
      name: accountName(user),
      initials: deriveInitials(user),
      email: accountEmail(user),
      can: (...needed: string[]) => canRoles(roles, ...needed),
      canAny: (...needed: string[]) => canAnyRoles(roles, ...needed),
      hasFlag: (key: string) => flags[key] === true,
    };
  }, [user, device, flagRows, isLoading, error]);
}
