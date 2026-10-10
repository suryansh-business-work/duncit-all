import { useEffect, useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, activeChipColumn, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { POD_CHALLENGES_TABLE, type PodChallengeListRow } from '../../graphql/pod-challenges';

export type PodChallengesView = 'all' | 'live' | 'results';

/** Each view is the same list narrowed to the statuses it is about. */
const VIEWS: Record<PodChallengesView, { statuses: string[] | null; titleKey: string; subtitleKey: string; tableId: string }> = {
  all: {
    statuses: null,
    titleKey: 'challenge.podChallenges.title',
    subtitleKey: 'challenge.podChallenges.subtitle',
    tableId: 'challenge-portal-pod-challenges',
  },
  live: {
    statuses: ['LIVE', 'PAUSED'],
    titleKey: 'challenge.podChallenges.liveTitle',
    subtitleKey: 'challenge.podChallenges.liveSubtitle',
    tableId: 'challenge-portal-live-monitor',
  },
  results: {
    statuses: ['COMPLETED', 'ARCHIVED'],
    titleKey: 'challenge.podChallenges.resultsTitle',
    subtitleKey: 'challenge.podChallenges.resultsSubtitle',
    tableId: 'challenge-portal-results',
  },
};

const STATUS_KEYS: Record<string, string> = {
  DRAFT: 'challenge.status.DRAFT',
  SCHEDULED: 'challenge.status.SCHEDULED',
  LIVE: 'challenge.status.LIVE',
  PAUSED: 'challenge.status.PAUSED',
  COMPLETED: 'challenge.status.COMPLETED',
  CANCELLED: 'challenge.status.CANCELLED',
  ARCHIVED: 'challenge.status.ARCHIVED',
};

/** How often the Live Monitor re-reads (other views change too slowly to need it). */
const LIVE_REFRESH_MS = 10_000;

const rowId = (r: PodChallengeListRow) => r.id;

/** Challenge Portal > Pod Challenges / Live Challenge Monitor / Results & Leaderboards. */
export default function PodChallengesPage({ view }: Readonly<{ view: PodChallengesView }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const config = VIEWS[view];
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<PodChallengeListRow>(
    client,
    POD_CHALLENGES_TABLE,
    'podChallengesTable',
    { extraVariables: { statuses: config.statuses } },
    [view]
  );

  useEffect(() => {
    if (view !== 'live') return undefined;
    const id = globalThis.setInterval(() => refetchRef.current?.(), LIVE_REFRESH_MS);
    return () => globalThis.clearInterval(id);
  }, [view]);

  const columns = useMemo<DuncitColumn<PodChallengeListRow>[]>(
    () => [
      { field: 'name', headerName: t('challenge.podChallenges.colChallenge'), type: 'text', flex: 1, minWidth: 200 },
      { field: 'pod_title', headerName: t('challenge.podChallenges.colPod'), type: 'text', flex: 1, minWidth: 200, sortable: false, filterable: false },
      {
        field: 'status',
        headerName: t('challenge.podChallenges.colStatus'),
        type: 'enum',
        width: 140,
        options: Object.entries(STATUS_KEYS).map(([value, key]) => ({ value, label: t(key) })),
        valueGetter: (r) => t(STATUS_KEYS[r.status] ?? r.status),
      },
      activeChipColumn<PodChallengeListRow>({ field: 'enabled', width: 110, outlineInactive: true }),
      { field: 'competitor_count', headerName: t('challenge.podChallenges.colCompetitors'), type: 'number', width: 130, sortable: false, filterable: false },
      { field: 'winners', headerName: t('challenge.podChallenges.colWinners'), type: 'text', minWidth: 180, sortable: false, filterable: false, valueGetter: (r) => r.winners || '—' },
      dateColumn<PodChallengeListRow>({ field: 'started_at', headerName: t('challenge.podChallenges.colStarted'), hide: false }),
      dateColumn<PodChallengeListRow>({ field: 'updated_at', headerName: t('challenge.podChallenges.colUpdated'), hide: false }),
      {
        field: 'live_url',
        headerName: t('challenge.podChallenges.colOpen'),
        type: 'actions',
        width: 90,
        cellRenderer: (r) => (
          <Tooltip title={t('challenge.podChallenges.openArena')}>
            <IconButton size="small" component="a" href={r.live_url} target="_blank" rel="noopener noreferrer" aria-label={`${t('challenge.podChallenges.openArena')}: ${r.name}`}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [t]
  );

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <SportsScoreIcon color="primary" />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
          {t(config.titleKey)}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t(config.subtitleKey)}
      </Typography>
      <DuncitTable<PodChallengeListRow>
        key={view}
        ariaLabel={t(config.titleKey)}
        tableId={config.tableId}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={rowId}
        refetchRef={refetchRef}
        emptyText={t('challenge.podChallenges.empty')}
        searchPlaceholder={t('challenge.podChallenges.search')}
        defaultSort={{ field: 'updated_at', dir: 'desc' }}
      />
    </Stack>
  );
}
