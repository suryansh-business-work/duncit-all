import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  hasPhoneFeatures,
  isSetUp,
  readPermissions,
  requestGroups,
  setupGroups,
} from '@/services/permissions';
import { useFeaturesStore } from '@/stores/features.store';

/**
 * Whether the phone's call features have what they need — including audio
 * access while recordings are on, without which no call recording is ever
 * found — and one `setUp` that asks for everything missing in a single system
 * prompt. Re-checked whenever the person comes back from Android Settings.
 * An iPhone has no call features, so it is always "ready".
 */
export function usePhoneSetup() {
  const recordings = useFeaturesStore((s) => s.recordings);
  const [ready, setReady] = useState(true);

  const check = useCallback(() => {
    if (!hasPhoneFeatures()) return;
    readPermissions()
      .then((state) => setReady(isSetUp(state, recordings)))
      .catch(() => setReady(false));
  }, [recordings]);

  useEffect(() => {
    check();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => subscription.remove();
  }, [check]);

  const setUp = useCallback(async () => {
    await requestGroups(setupGroups(recordings));
    check();
  }, [recordings, check]);

  return { ready, setUp };
}
