import { useState, type ReactElement } from 'react';
import { Box, Chip, CircularProgress, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import type { DuncitColumn } from '@duncit/table';
import { formatDateTime } from '@duncit/app-settings';
import type { AppBuildRow } from './queries';
import ReleaseLogDialog from './ReleaseLogDialog';
import { releaseWhen } from './StoreReleases';

/**
 * The store column, for either store: one cell per track, each showing where
 * that track stands on this build. Google Play and App Store Connect differ in
 * their tracks, their labels and what a release entry carries, and agree on
 * everything the cell does — so the cell is written once and each store hands
 * it a config.
 */

/** The least a release entry has to carry for the cell to show it. */
export interface TrackRelease {
  status: 'PUSHING' | 'RELEASED' | 'FAILED';
  error: string;
  by?: string;
  /** The push's step log, when the store's push keeps one. */
  log?: string[];
  started_at: string;
  finished_at: string | null;
}

export interface StoreTrackConfig<T extends string, R extends TrackRelease> {
  field: Extract<keyof AppBuildRow, string>;
  header: string;
  tracks: readonly T[];
  /** The word on the button and the chip. */
  short: Record<T, string>;
  /** The track that reaches every user says so in colour. */
  color: Record<T, 'primary' | 'warning'>;
  icon: ReactElement;
  /** `play` / `app-store` — the test ids are built from it. */
  testId: string;
  latest: (row: AppBuildRow, track: T) => R | null;
  inFlight: (release: R) => boolean;
  canPush: (row: AppBuildRow) => boolean;
  tips: {
    push: (track: T) => string;
    pushing: (track: T, release: R, when: string) => string;
    released: (track: T, release: R, when: string) => string;
    failed: (track: T, error: string) => string;
    /** Names the button that opens a failed push's log. */
    logs: (track: T) => string;
    unavailable: string;
  };
  onPush: (row: AppBuildRow, track: T) => Promise<void>;
  value: (row: AppBuildRow) => string;
}

interface TrackCellProps<T extends string, R extends TrackRelease> {
  row: AppBuildRow;
  track: T;
  cfg: StoreTrackConfig<T, R>;
}

/**
 * One track's state on one build: a spinner while a push is in flight, a green
 * chip once it landed, and otherwise the button — including after a failure,
 * where the tooltip carries the store's reason, the press retries, and a second
 * button opens the failed push's log.
 */
function TrackCell<T extends string, R extends TrackRelease>({ row, track, cfg }: Readonly<TrackCellProps<T, R>>) {
  const [logOpen, setLogOpen] = useState(false);
  const release = cfg.latest(row, track);
  const id = `app-builds-${cfg.testId}-${track.toLowerCase()}`;
  if (release && cfg.inFlight(release)) {
    return (
      <Tooltip title={cfg.tips.pushing(track, release, formatDateTime(release.started_at))}>
        <Chip
          size="small"
          color="info"
          variant="outlined"
          icon={<CircularProgress size={12} thickness={6} color="inherit" />}
          label={cfg.short[track]}
          data-testid={`${id}-pushing`}
        />
      </Tooltip>
    );
  }
  if (release?.status === 'RELEASED') {
    const when = releaseWhen(release);
    return (
      <Tooltip title={cfg.tips.released(track, release, when)}>
        <Chip size="small" color="success" icon={<CheckCircleIcon />} label={cfg.short[track]} data-testid={`${id}-released`} />
      </Tooltip>
    );
  }
  const failed = release?.status === 'FAILED';
  const enabled = cfg.canPush(row);
  let tip = cfg.tips.unavailable;
  if (failed) {
    tip = cfg.tips.failed(track, release.error);
  } else if (enabled) {
    tip = cfg.tips.push(track);
  }
  const color = failed ? 'error' : cfg.color[track];
  return (
    <>
      <Tooltip title={tip}>
        <span>
          <DuncitButton
            size="small"
            variant="outlined"
            color={color}
            disabled={!enabled}
            startIcon={cfg.icon}
            onClick={() => cfg.onPush(row, track)}
            data-testid={`${id}-push`}
          >
            {cfg.short[track]}
          </DuncitButton>
        </span>
      </Tooltip>
      {failed && (
        <>
          <Tooltip title={cfg.tips.logs(track)}>
            <DuncitIconButton
              size="small"
              color="error"
              aria-label={cfg.tips.logs(track)}
              onClick={() => setLogOpen(true)}
              data-testid={`${id}-logs`}
            >
              <ArticleOutlinedIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
          <ReleaseLogDialog
            open={logOpen}
            subject={`${row.build_no} · ${cfg.short[track]}`}
            release={release}
            onClose={() => setLogOpen(false)}
          />
        </>
      )}
    </>
  );
}

/** Every track side by side. Clicks stop here so they never also open the row. */
function StoreCell<T extends string, R extends TrackRelease>({ row, cfg }: Readonly<{ row: AppBuildRow; cfg: StoreTrackConfig<T, R> }>) {
  return (
    <Box
      role="presentation"
      onClick={(e) => e.stopPropagation()}
      sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}
      data-testid={`app-builds-${cfg.testId}-cell-${row.id}`}
    >
      {cfg.tracks.map((track) => (
        <TrackCell key={track} row={row} track={track} cfg={cfg} />
      ))}
    </Box>
  );
}

export function makeStoreTrackColumn<T extends string, R extends TrackRelease>(
  cfg: StoreTrackConfig<T, R>
): DuncitColumn<AppBuildRow> {
  const render = (row: AppBuildRow) => <StoreCell row={row} cfg={cfg} />;
  return {
    field: cfg.field,
    headerName: cfg.header,
    // Room for both tracks with a failed push's log button beside each.
    width: 300,
    // Push buttons per track — a row control, not a value.
    type: 'actions',
    cellRenderer: render,
    valueGetter: cfg.value,
  };
}
