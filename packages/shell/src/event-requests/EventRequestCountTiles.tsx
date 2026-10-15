import { Alert, Box, Skeleton } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { formatCount } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';
import type { EventRequestCounts } from './queries';

interface Props {
  counts: EventRequestCounts | null;
  loading: boolean;
  failed: boolean;
}

/** Open / Fulfilled / Dismissed / Total — one aliased read, so the four always reconcile. */
export function EventRequestCountTiles({ counts, loading, failed }: Readonly<Props>) {
  const { t } = useTranslation();
  if (failed) return <Alert severity="warning">{t('publicPage.eventRequests.countsFailed')}</Alert>;
  const tiles = [
    { id: 'open', label: t('publicPage.eventRequests.statusOpen'), value: counts?.open },
    { id: 'fulfilled', label: t('publicPage.eventRequests.statusFulfilled'), value: counts?.fulfilled },
    { id: 'dismissed', label: t('publicPage.eventRequests.statusDismissed'), value: counts?.dismissed },
    { id: 'total', label: t('publicPage.eventRequests.total'), value: counts?.total },
  ];
  return (
    <Box
      component="ul"
      aria-busy={loading}
      sx={(theme) => ({
        display: 'grid',
        gap: 2,
        gridTemplateColumns: `repeat(auto-fill,minmax(${theme.spacing(20)},1fr))`,
        listStyle: 'none',
        m: 0,
        p: 0,
      })}
    >
      {tiles.map((tile) => (
        <Box component="li" key={tile.id} sx={{ minWidth: 0 }}>
          {loading && !counts ? (
            <Skeleton variant="rounded" height={88} />
          ) : (
            <StatCard
              label={tile.label}
              value={formatCount(tile.value ?? 0)}
              testId={`event-requests-tile-${tile.id}`}
              sx={{ height: '100%' }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}
