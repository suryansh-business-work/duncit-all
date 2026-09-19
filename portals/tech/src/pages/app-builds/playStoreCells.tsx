import ShopIcon from '@mui/icons-material/Shop';
import type { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import { makeStoreTrackColumn } from './storeTrackCells';
import {
  PLAY_TRACKS,
  canPushToPlay,
  isPushInFlight,
  latestPlayRelease,
  type AppBuildPlayRelease,
  type AppBuildRow,
  type PlayStoreTrack,
} from './queries';
import type { PushToPlay } from './usePlayStorePush';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The Google Play column — Android tables only, since only an AAB can go there. */
export const makePlayStoreColumn = (t: Translate, onPush: PushToPlay): DuncitColumn<AppBuildRow> => {
  const track: Record<PlayStoreTrack, string> = {
    INTERNAL: t('tech.appBuilds.playTrackInternal'),
    PRODUCTION: t('tech.appBuilds.playTrackProduction'),
  };
  return makeStoreTrackColumn<PlayStoreTrack, AppBuildPlayRelease>({
    field: 'play_releases',
    header: t('tech.appBuilds.colPlayStore'),
    tracks: PLAY_TRACKS,
    short: {
      INTERNAL: t('tech.appBuilds.playInternal'),
      PRODUCTION: t('tech.appBuilds.playProduction'),
    },
    // Production is the one that reaches every user, so its button says so in colour.
    color: { INTERNAL: 'primary', PRODUCTION: 'warning' },
    icon: <ShopIcon />,
    testId: 'play',
    latest: latestPlayRelease,
    inFlight: isPushInFlight,
    canPush: canPushToPlay,
    tips: {
      push: (k) => t('tech.appBuilds.playPush', { vars: { track: track[k] } }),
      pushing: (k, _r, when) => t('tech.appBuilds.playPushingTip', { vars: { track: track[k], when } }),
      released: (k, r, when) =>
        t('tech.appBuilds.playReleasedTip', { vars: { track: track[k], code: r.version_code, by: r.by, when } }),
      failed: (k, error) => t('tech.appBuilds.playFailedTip', { vars: { track: track[k], error } }),
      unavailable: t('tech.appBuilds.playUnavailable'),
    },
    onPush,
    value: (row) => row.play_releases.map((r) => `${r.track}:${r.status}`).join(','),
  });
};
