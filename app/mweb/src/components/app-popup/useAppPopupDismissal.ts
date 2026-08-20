import { useCallback, useEffect, useState } from 'react';
import {
  readDismissedPopupIds,
  rememberDismissedPopup,
  withDismissedPopupId,
  type AppPopupStorage,
} from '@duncit/utils';

/**
 * `localStorage` behind the shared storage contract. Reached lazily so a
 * browser that blocks storage throws inside the shared reader's guard rather
 * than at module load.
 */
const webStorage: AppPopupStorage = {
  getItem: (key) => globalThis.localStorage.getItem(key),
  setItem: (key, value) => globalThis.localStorage.setItem(key, value),
};

export interface AppPopupDismissal {
  /** False until the stored ids have been read. Nothing is drawn before then,
   * so a popup this device already closed never flashes on the way in. */
  ready: boolean;
  /** Popup ids closed on this device. */
  dismissed: string[];
  dismiss: (id: string) => void;
}

/**
 * The popup ids this browser has closed.
 *
 * All of the logic — the key, the list shape, the cap, the guards around
 * unavailable storage — is `@duncit/utils`; this is only the React binding and
 * the choice of backing store. The native app keeps the same hook over
 * `expo-secure-store`, which is the same split as everywhere else: share the
 * rules, keep the platform primitive local.
 */
export function useAppPopupDismissal(): AppPopupDismissal {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    readDismissedPopupIds(webStorage).then((ids) => {
      if (!live) return;
      setDismissed(ids);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);

  // The list updates immediately so the overlay closes on the same frame; the
  // write follows, and a failed write only costs the popup showing once more.
  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => withDismissedPopupId(prev, id));
    rememberDismissedPopup(webStorage, id).catch(() => undefined);
  }, []);

  return { ready, dismissed, dismiss };
}
