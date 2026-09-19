import AppleIcon from '@mui/icons-material/Apple';
import type { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import { makeStoreTrackColumn } from './storeTrackCells';
import {
  APP_STORE_TRACKS,
  canPushToAppStore,
  isAppStorePushInFlight,
  latestAppStoreRelease,
  type AppBuildAppStoreRelease,
  type AppBuildRow,
  type AppStoreTrack,
} from './queries';
import type { PushToAppStore } from './useAppStorePush';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The App Store column — iOS tables only, since only an IPA can go there. */
export const makeAppStoreColumn = (t: Translate, onPush: PushToAppStore): DuncitColumn<AppBuildRow> => {
  const track: Record<AppStoreTrack, string> = {
    TESTFLIGHT: t('tech.appBuilds.appStoreTrackTestflight'),
    APP_STORE: t('tech.appBuilds.appStoreTrackReview'),
  };
  // What "done" means differs per track: processed for testers, or handed to App Review.
  const released: Record<AppStoreTrack, (r: AppBuildAppStoreRelease, when: string) => string> = {
    TESTFLIGHT: (r, when) => t('tech.appBuilds.appStoreReleasedTestflightTip', { vars: { by: r.by, when } }),
    APP_STORE: (r, when) => t('tech.appBuilds.appStoreReleasedReviewTip', { vars: { by: r.by, when } }),
  };
  return makeStoreTrackColumn<AppStoreTrack, AppBuildAppStoreRelease>({
    field: 'app_store_releases',
    header: t('tech.appBuilds.colAppStore'),
    tracks: APP_STORE_TRACKS,
    short: {
      TESTFLIGHT: t('tech.appBuilds.appStoreTestflight'),
      APP_STORE: t('tech.appBuilds.appStoreReview'),
    },
    // App Review is the one that reaches every user, so its button says so in colour.
    color: { TESTFLIGHT: 'primary', APP_STORE: 'warning' },
    icon: <AppleIcon />,
    testId: 'app-store',
    latest: latestAppStoreRelease,
    inFlight: isAppStorePushInFlight,
    canPush: canPushToAppStore,
    tips: {
      push: (k) => t('tech.appBuilds.appStorePush', { vars: { track: track[k] } }),
      pushing: (k, r, when) =>
        t('tech.appBuilds.appStorePushingTip', { vars: { track: track[k], stage: r.stage, when } }),
      released: (k, r, when) => released[k](r, when),
      failed: (k, error) => t('tech.appBuilds.appStoreFailedTip', { vars: { track: track[k], error } }),
      unavailable: t('tech.appBuilds.appStoreUnavailable'),
    },
    onPush,
    value: (row) => row.app_store_releases.map((r) => `${r.track}:${r.status}`).join(','),
  });
};
