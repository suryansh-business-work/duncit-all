import { useEffect } from 'react';
import { AppState } from 'react-native';
import { fireAndForget, logs } from '@duncit/logs';

import { navigationRef } from '@/navigation/navigationRef';
import { registerBackgroundSync, runSync } from '@/services/background-sync';
import { useAuthStore } from '@/stores/auth.store';
import { useFeaturesStore } from '@/stores/features.store';
import { useLocaleStore } from '@/stores/locale.store';
import { usePostCallStore } from '@/stores/postCall.store';

/** A call just ended with a CRM contact: open its post-call screen once the app can navigate. */
export function openPendingPostCall(): void {
  if (usePostCallStore.getState().collect() && navigationRef.isReady()) navigationRef.navigate('PostCall');
}

/**
 * The app's lifecycle in one place: restore the session and the language on
 * launch; once signed in, schedule the background sync and run a sync (and
 * look for a just-ended call) every time the app comes to the front.
 */
export function useAppSession(): void {
  const status = useAuthStore((s) => s.status);
  const locale = useAuthStore((s) => s.user?.locale ?? null);

  useEffect(() => {
    fireAndForget(useFeaturesStore.getState().hydrate(), logs.mobileApp, 'crm-app/useAppSession', 'hydrate');
    fireAndForget(useAuthStore.getState().bootstrap(), logs.mobileApp, 'crm-app/useAppSession', 'bootstrap');
  }, []);

  useEffect(() => {
    fireAndForget(useLocaleStore.getState().load(locale), logs.mobileApp, 'crm-app/useAppSession', 'load');
  }, [locale]);

  useEffect(() => {
    if (status !== 'signedIn') return undefined;
    fireAndForget(registerBackgroundSync(), logs.mobileApp, 'crm-app/useAppSession', 'registerBackgroundSync');
    fireAndForget(runSync(), logs.mobileApp, 'crm-app/useAppSession', 'runSync');
    openPendingPostCall();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      openPendingPostCall();
      fireAndForget(runSync(), logs.mobileApp, 'crm-app/useAppSession', 'runSync');
    });
    return () => subscription.remove();
  }, [status]);
}
