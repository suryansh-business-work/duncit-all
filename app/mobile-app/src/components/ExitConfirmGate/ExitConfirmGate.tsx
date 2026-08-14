import { useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { navigationRef } from '@/navigation/navigationRef';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Asks before the back button closes the app.
 *
 * Android's back button is a single tap away from quitting, and on a root tab
 * there is nothing between "I meant to go back one more screen" and the app
 * disappearing — with a half-filled pod form behind it.
 *
 * The guard is deliberately ORDER-INDEPENDENT. React Native runs
 * `hardwareBackPress` subscriptions in reverse registration order and exits
 * only once every one of them declines, so a handler that assumed it ran first
 * (or last) would be a bug waiting for the next component that registers one.
 * Instead this asks the same question React Navigation asks — can anything be
 * gone back to? — and declines whenever the answer is yes, leaving ordinary
 * back presses entirely alone whichever order the two run in.
 */
export function ExitConfirmGate() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // iOS has no hardware back, and react-native-web's BackHandler is a stub.
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // Somewhere to go back to — not our press. React Navigation takes it.
      if (navigationRef.isReady() && navigationRef.canGoBack()) return false;
      setOpen(true);
      return true;
    });
    return () => subscription.remove();
  }, []);

  if (Platform.OS !== 'android') return null;

  return (
    <ConfirmDialog
      open={open}
      title={t('mweb.exitConfirm.title')}
      message={t('mweb.exitConfirm.message')}
      confirmLabel={t('mweb.exitConfirm.confirm')}
      cancelLabel={t('mweb.exitConfirm.cancel')}
      onConfirm={() => BackHandler.exitApp()}
      onCancel={() => setOpen(false)}
      testID="exit-confirm"
    />
  );
}
