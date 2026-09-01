import { useCallback, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { parseApiError } from '@duncit/utils';
import { StatCard } from '@duncit/ui';
import { AppIcon } from '@duncit/shell';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import type { TableQueryState } from '@duncit/table';
import CancellationsTable from './CancellationsTable';
import CancellationDetailDialog from './CancellationDetailDialog';
import {
  applyCancellationQuery,
  money,
  POD_CANCELLATIONS,
  POD_CANCELLATION_STATS,
  type PodCancellationRow,
  type PodCancellationStats,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

const cards = (t: Translate) => [
  { key: 'total_cancelled', label: t('finance.cancellations.totalPodCancels'), icon: 'analytics', money: false },
  { key: 'cancelled_by_host', label: t('finance.cancellations.cancelledByHosts'), icon: 'receipt', money: false },
  { key: 'cancelled_by_venue', label: t('finance.cancellations.cancelledByVenues'), icon: 'storefront', money: false },
  { key: 'cancelled_by_club_admin', label: t('finance.cancellations.cancelledByClubAdmins'), icon: 'dashboard', money: false },
  { key: 'total_refund_amount', label: t('finance.cancellations.totalRefundAmount'), icon: 'payments', money: true },
] as const;

/** Cancel & Refunds home — KPI tiles over every cancellation plus the full
 * newest-first list across hosts, venues and admins. */
export default function CancellationsDashboardPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [selected, setSelected] = useState<PodCancellationRow | null>(null);
  const { data, loading, error } = useQuery<{ podCancellationStats: PodCancellationStats }>(
    POD_CANCELLATION_STATS,
    { fetchPolicy: 'cache-and-network' },
  );
  const stats = data?.podCancellationStats;
  const sym = stats?.currency_symbol ?? '';

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const result = await client.query<{ podCancellations: PodCancellationRow[] }>({
        query: POD_CANCELLATIONS,
        variables: { kind: null },
        fetchPolicy: 'network-only',
      });
      return applyCancellationQuery(result.data?.podCancellations ?? [], q);
    },
    [client],
  );

  const widgets: DashboardWidget[] = [
    ...cards(t).map((card, index) => ({
      id: card.key,
      bare: true,
      // Five tiles across twelve columns: two rows of two-and-a-half is
      // unreadable, so they run 3-wide and wrap onto a second row.
      defaultLayout: { x: (index % 4) * 3, y: Math.floor(index / 4) * 2, w: 3, h: 2 },
      minW: 2,
      minH: 2,
      content: (
        <StatCard
          label={card.label}
          value={card.money ? money(sym, stats?.[card.key] ?? 0) : String(stats?.[card.key] ?? 0)}
          icon={<AppIcon name={card.icon} fontSize="small" />}
          loading={loading && !stats}
          sx={{ borderRadius: 3, height: '100%' }}
        />
      ),
    })),
    {
      id: 'cancellations-table',
      title: t('finance.cancellations.everyCancelledPod'),
      disablePadding: true,
      defaultLayout: { x: 0, y: 4, w: 12, h: 8 },
      minW: 4,
      minH: 4,
      content: (
        <CancellationsTable
          tableId="finance-cancellations-all"
          fetchRows={fetchRows}
          onRowClick={setSelected}
          showKind
          emptyText={t('finance.cancellations.noPodsHaveBeenCancelledYet')}
        />
      ),
    },
  ];

  return (
    <>
      <DuncitDashboard
        dashboardId="finance.cancellations"
        header={
          <Box>
            <Stack direction="row" spacing={1.5} sx={{
              alignItems: "center"
            }}>
              <EventBusyIcon color="primary" />
              <Box>
                <Typography variant="h5" sx={{
                  fontWeight: 700
                }}>
                  Cancel & Refunds
                </Typography>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  Every cancelled pod — who cancelled it, why, and where the money went.
                </Typography>
              </Box>
            </Stack>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{parseApiError(error)}</Alert>}
          </Box>
        }
        widgets={widgets}
      />
      <CancellationDetailDialog row={selected} onClose={() => setSelected(null)} />
    </>
  );
}
