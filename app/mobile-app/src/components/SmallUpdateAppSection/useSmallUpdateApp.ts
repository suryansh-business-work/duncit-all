import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { logs } from '@duncit/logs';

import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { getItem, setItem } from '@/services/secure-storage';
import { useAppVersionStore } from '@/stores/app-version.store';
import { appVersion } from '@/utils/app-version';
import { isOutdated } from '@/utils/semver';

/**
 * Tech Portal -> Feature Flags -> "Small Update App Section". Seeded OFF on the
 * server: `latest_version` is auto-synced on every deploy, so an operator turns
 * the nudge on once the stores actually carry the release it points at.
 */
export const SMALL_UPDATE_APP_SECTION_FLAG = 'small_update_app_section';

/** The `latest_version` the member last closed the section for. */
const DISMISSED_KEY = 'duncit.update_section_dismissed_version';

export interface SmallUpdateApp {
  visible: boolean;
  latest: string;
  openStore: () => void;
  dismiss: () => void;
}

/**
 * Whether to show the soft "update available" section, and its two actions.
 * Reuses the force-update gate's sources: `appVersionInfo` (fetched once at boot
 * in App.tsx) for the latest version + store URLs, and `isOutdated` for the
 * compare — major/minor only, so the per-deploy PATCH bump never nags.
 *
 * Closing it stores that `latest_version`; it comes back only once a release
 * whose major/minor is ahead of the closed one lands. Hidden on web (no store
 * binary) and when the server has no store URL for this platform.
 */
export function useSmallUpdateApp(): SmallUpdateApp {
  const enabled = useFeatureFlag(SMALL_UPDATE_APP_SECTION_FLAG, false);
  const info = useAppVersionStore((s) => s.data)?.appVersionInfo;
  // `undefined` while the saved choice loads — nothing renders until it is known,
  // so a closed section never flashes back for a frame on launch.
  const [dismissed, setDismissed] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getItem(DISMISSED_KEY)
      .then((value) => {
        if (active) setDismissed(value ?? '');
      })
      .catch((error: unknown) => {
        logs.mobileApp.warn('smallUpdateAppSection', 'loadDismissed', { error });
        if (active) setDismissed('');
      });
    return () => {
      active = false;
    };
  }, []);

  const latest = info?.latest_version ?? '';
  const storeUrl = (Platform.OS === 'ios' ? info?.ios_store_url : info?.android_store_url) ?? '';

  const visible =
    Platform.OS !== 'web' &&
    enabled &&
    dismissed !== undefined &&
    storeUrl !== '' &&
    isOutdated(appVersion(), latest) &&
    (dismissed === '' || isOutdated(dismissed, latest));

  const openStore = useCallback(() => {
    Linking.openURL(storeUrl).catch((error: unknown) => {
      logs.mobileApp.warn('smallUpdateAppSection', 'openStore', { error });
    });
  }, [storeUrl]);

  const dismiss = useCallback(() => {
    setDismissed(latest);
    setItem(DISMISSED_KEY, latest).catch((error: unknown) => {
      logs.mobileApp.warn('smallUpdateAppSection', 'saveDismissed', { error });
    });
  }, [latest]);

  return { visible, latest, openStore, dismiss };
}
