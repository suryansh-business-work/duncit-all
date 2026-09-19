import { PUSH_APP_BUILD_TO_APP_STORE, type AppStoreTrack } from './queries';
import { useStorePush, type PushToStore, type StorePushCopy } from './useStorePush';

const APP_STORE_PUSH_COPY: StorePushCopy<AppStoreTrack> = {
  trackKey: {
    TESTFLIGHT: 'tech.appBuilds.appStoreTrackTestflight',
    APP_STORE: 'tech.appBuilds.appStoreTrackReview',
  },
  confirmKey: {
    TESTFLIGHT: 'tech.appBuilds.appStoreConfirmTestflight',
    APP_STORE: 'tech.appBuilds.appStoreConfirmReview',
  },
  titleKey: 'tech.appBuilds.appStoreConfirmTitle',
  actionKey: 'tech.appBuilds.appStoreConfirmAction',
  startedKey: 'tech.appBuilds.appStoreStarted',
  destructive: 'APP_STORE',
};

export type PushToAppStore = PushToStore<AppStoreTrack>;

/** Confirm, then push one build's IPA to TestFlight or App Review. */
export const useAppStorePush = (onPushed: () => void): PushToAppStore =>
  useStorePush(PUSH_APP_BUILD_TO_APP_STORE, APP_STORE_PUSH_COPY, onPushed);
