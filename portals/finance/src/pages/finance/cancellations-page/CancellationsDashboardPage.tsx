import { useCallback, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Alert, Box, Stack, Typography } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { parseApiError } from '@duncit/utils';
import { StatCard } from '@duncit/ui';
import { AppIcon } from '@duncit/shell';
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

const CARDS = [
  { key: 'total_cancelled', label: 'Total pod cancels', icon: 'analytics', money: false },
  { key: 'cancelled_by_host', label: 'Cancelled by hosts', icon: 'receipt', money: false },
  { key: 'cancelled_by_venue', label: 'Cancelled by venues', icon: 'storefront', money: false },
  { key: 'cancelled_by_club_admin', label: 'Cancelled by club admins', icon: 'dashboard', money: false },
  { key: 'total_refund_amount', label: 'Total refund amount', icon: 'payments', money: true },
] as const;

/** Cancel & Refunds home — KPI tiles over every cancellation plus the full
 * newest-first list across hosts, venues and admins. */
export default function CancellationsDashboardPage() {
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

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <EventBusyIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Cancel & Refunds
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Every cancelled pod — who cancelled it, why, and where the money went.
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{parseApiError(error)}</Alert>}

      <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2} sx={{ mb: 3 }}>
        {CARDS.map((card) => {
          const value = stats?.[card.key] ?? 0;
          return (
            <StatCard
              key={card.key}
              label={card.label}
              value={card.money ? money(sym, value) : String(value)}
              icon={<AppIcon name={card.icon} fontSize="small" />}
              loading={loading && !stats}
              sx={{ borderRadius: 3, flex: '1 1 200px', minWidth: 200 }}
            />
          );
        })}
      </Stack>

      <CancellationsTable
        tableId="finance-cancellations-all"
        fetchRows={fetchRows}
        onRowClick={setSelected}
        showKind
        emptyText="No pods have been cancelled yet."
      />
      <CancellationDetailDialog row={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
