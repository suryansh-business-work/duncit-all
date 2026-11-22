import { useState } from 'react';
import { useNavigation, usePreventRemove, type NavigationAction } from '@react-navigation/native';
import { logs } from '@duncit/logs';
import type { DraftAutosaveHandle } from '@duncit/utils';

/**
 * Holds Create Pod's back button, hardware back and swipe-back while the draft
 * has unsaved changes: it saves them first, then leaves. Only when that save
 * fails does it stop and ask, through `prompt` (mWeb twin: the page's close
 * button). A pod that was just published has nothing unsaved, so its own
 * navigation passes straight through. `usePreventRemove` (not a bare
 * beforeRemove listener) so the native stack holds its swipe gesture too.
 */
export function useDraftLeaveGuard(autosave: DraftAutosaveHandle | null) {
  const navigation = useNavigation();
  const [pending, setPending] = useState<NavigationAction | null>(null);

  usePreventRemove(!!autosave?.unsaved, ({ data }) => {
    if (!autosave) return;
    autosave
      .flush()
      .then((saved) => {
        // Dispatching the held action again is not held a second time.
        if (saved) navigation.dispatch(data.action);
        else setPending(data.action);
      })
      .catch((error: unknown) => {
        logs.mobileApp.warn('create-pod', 'leaveGuard', { error });
        setPending(data.action);
      });
  });

  return {
    /** The save failed: ask before leaving. */
    prompt: pending !== null,
    stay: () => setPending(null),
    leave: () => {
      if (!pending) return;
      setPending(null);
      navigation.dispatch(pending);
    },
  };
}
