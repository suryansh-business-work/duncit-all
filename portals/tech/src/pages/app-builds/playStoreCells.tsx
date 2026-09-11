import { Box, Chip, CircularProgress, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShopIcon from '@mui/icons-material/Shop';
import { DuncitButton } from '@duncit/buttons';
import type { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import { formatDateTime } from '@duncit/app-settings';
import {
  PLAY_TRACKS,
  canPushToPlay,
  isPushInFlight,
  latestPlayRelease,
  type AppBuildRow,
  type PlayStoreTrack,
} from './queries';
import type { PushToPlay } from './usePlayStorePush';

type Translate = ReturnType<typeof useTranslation>['t'];

interface PlayLabels {
  header: string;
  short: Record<PlayStoreTrack, string>;
  track: Record<PlayStoreTrack, string>;
  push: (track: string) => string;
  pushing: (track: string, when: string) => string;
  released: (track: string, code: string, by: string, when: string) => string;
  failed: (track: string, error: string) => string;
  unavailable: string;
}

const makePlayLabels = (t: Translate): PlayLabels => ({
  header: t('tech.appBuilds.colPlayStore'),
  short: {
    INTERNAL: t('tech.appBuilds.playInternal'),
    PRODUCTION: t('tech.appBuilds.playProduction'),
  },
  track: {
    INTERNAL: t('tech.appBuilds.playTrackInternal'),
    PRODUCTION: t('tech.appBuilds.playTrackProduction'),
  },
  push: (track) => t('tech.appBuilds.playPush', { vars: { track } }),
  pushing: (track, when) => t('tech.appBuilds.playPushingTip', { vars: { track, when } }),
  released: (track, code, by, when) =>
    t('tech.appBuilds.playReleasedTip', { vars: { track, code, by, when } }),
  failed: (track, error) => t('tech.appBuilds.playFailedTip', { vars: { track, error } }),
  unavailable: t('tech.appBuilds.playUnavailable'),
});

/** Production is the one that reaches every user, so its button says so in colour. */
const BUTTON_COLOR: Record<PlayStoreTrack, 'primary' | 'warning'> = {
  INTERNAL: 'primary',
  PRODUCTION: 'warning',
};

interface TrackCellProps {
  row: AppBuildRow;
  track: PlayStoreTrack;
  labels: PlayLabels;
  onPush: PushToPlay;
}

/**
 * One track's state on one build: a spinner while a push is in flight, a green
 * chip once it is on the track, and otherwise the button — including after a
 * failure, where the tooltip carries Google's reason and the press retries.
 */
const TrackCell = ({ row, track, labels, onPush }: Readonly<TrackCellProps>) => {
  const release = latestPlayRelease(row, track);
  const trackLabel = labels.track[track];
  if (release && isPushInFlight(release)) {
    return (
      <Tooltip title={labels.pushing(trackLabel, formatDateTime(release.started_at))}>
        <Chip
          size="small"
          color="info"
          variant="outlined"
          icon={<CircularProgress size={12} thickness={6} color="inherit" />}
          label={labels.short[track]}
        />
      </Tooltip>
    );
  }
  if (release?.status === 'RELEASED') {
    const when = formatDateTime(release.finished_at ?? release.started_at);
    return (
      <Tooltip title={labels.released(trackLabel, release.version_code, release.by, when)}>
        <Chip size="small" color="success" icon={<CheckCircleIcon />} label={labels.short[track]} />
      </Tooltip>
    );
  }
  const failed = release?.status === 'FAILED';
  const enabled = canPushToPlay(row);
  let tip = labels.unavailable;
  if (failed) {
    tip = labels.failed(trackLabel, release.error);
  } else if (enabled) {
    tip = labels.push(trackLabel);
  }
  const color = failed ? 'error' : BUTTON_COLOR[track];
  return (
    <Tooltip title={tip}>
      <span>
        <DuncitButton
          size="small"
          variant="outlined"
          color={color}
          disabled={!enabled}
          startIcon={<ShopIcon />}
          onClick={() => onPush(row, track)}
        >
          {labels.short[track]}
        </DuncitButton>
      </span>
    </Tooltip>
  );
};

interface PlayCellProps {
  row: AppBuildRow;
  labels: PlayLabels;
  onPush: PushToPlay;
}

/** Both tracks side by side. Clicks stop here so they never also open the row. */
const PlayCell = ({ row, labels, onPush }: Readonly<PlayCellProps>) => (
  <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
    {PLAY_TRACKS.map((track) => (
      <TrackCell key={track} row={row} track={track} labels={labels} onPush={onPush} />
    ))}
  </Box>
);

/** The Google Play column — Android tables only, since only an AAB can go there. */
export const makePlayStoreColumn = (t: Translate, onPush: PushToPlay): DuncitColumn<AppBuildRow> => {
  const labels = makePlayLabels(t);
  const renderPlay = (row: AppBuildRow) => <PlayCell row={row} labels={labels} onPush={onPush} />;
  return {
    field: 'play_releases',
    headerName: labels.header,
    width: 235,
    sortable: false,
    cellRenderer: renderPlay,
    valueGetter: (row) => row.play_releases.map((r) => `${r.track}:${r.status}`).join(','),
  };
};
