import { PUSH_APP_BUILD_TO_PLAY_STORE, type PlayStoreTrack } from './queries';
import { useStorePush, type PushToStore, type StorePushCopy } from './useStorePush';

const PLAY_PUSH_COPY: StorePushCopy<PlayStoreTrack> = {
  trackKey: {
    INTERNAL: 'tech.appBuilds.playTrackInternal',
    PRODUCTION: 'tech.appBuilds.playTrackProduction',
  },
  confirmKey: {
    INTERNAL: 'tech.appBuilds.playConfirmInternal',
    PRODUCTION: 'tech.appBuilds.playConfirmProduction',
  },
  titleKey: 'tech.appBuilds.playConfirmTitle',
  actionKey: 'tech.appBuilds.playConfirmAction',
  startedKey: 'tech.appBuilds.playStarted',
  destructive: 'PRODUCTION',
};

export type PushToPlay = PushToStore<PlayStoreTrack>;

/** Confirm, then push one build's AAB to a Play track. */
export const usePlayStorePush = (onPushed: () => void): PushToPlay =>
  useStorePush(PUSH_APP_BUILD_TO_PLAY_STORE, PLAY_PUSH_COPY, onPushed);
