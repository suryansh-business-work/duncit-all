import { useCallback, useEffect, useState } from 'react';
import {
  readDismissedPopupIds,
  rememberDismissedPopup,
  withDismissedPopupId,
  type AppPopupStorage,
} from '@duncit/utils';

import { getItem, setItem } from '@/services/secure-storage';
import { fireAndForget } from '@/utils/fire-and-forget';

/** The app's own key/value store behind the shared storage contract — the OS
 * secure store on a phone, `localStorage` on the web build, resolved by Metro. */
const appStorage: AppPopupStorage = { getItem, setItem };

export interface AppPopupDismissal {
  /** False until the stored ids have been read. Nothing is drawn before then,
   * so a popup this device already closed never flashes on the way in. */
  ready: boolean;
  /** Popup ids closed on this device. */
  dismissed: string[];
  dismiss: (id: string) => void;
}

/**
 * The popup ids this device has closed.
 *
 * All of the logic — the key, the list shape, the cap, the guards around
 * unavailable storage — is `@duncit/utils`; this is only the React binding and
 * the choice of backing store. mWeb keeps the same hook over `localStorage`,
 * which is the usual split: share the rules, keep the platform primitive local.
 */
export function useAppPopupDismissal(): AppPopupDismissal {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    fireAndForget(
      readDismissedPopupIds(appStorage).then((ids) => {
        if (!live) return;
        setDismissed(ids);
        setReady(true);
      }),
    );
    return () => {
      live = false;
    };
  }, []);

  // The list updates immediately so the overlay closes on the same frame; the
  // write follows, and a failed write only costs the popup showing once more.
  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => withDismissedPopupId(prev, id));
    fireAndForget(rememberDismissedPopup(appStorage, id));
  }, []);

  return { ready, dismissed, dismiss };
}
