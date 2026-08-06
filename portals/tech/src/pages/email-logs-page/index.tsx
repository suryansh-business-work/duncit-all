import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useUserData } from '@duncit/user-context';
import { useApolloTableFetch } from '@duncit/table';
import { SUPER_ROLE } from '../../lib/session';
import EmailLogBulkBar, { EmailLogDeleteAllButton } from './EmailLogBulkBar';
import EmailLogQuickFilters, {
  EMPTY_QUICK_FILTERS,
  quickFiltersToTable,
  type QuickFilterState,
} from './EmailLogQuickFilters';
import EmailLogDrawer from './EmailLogDrawer';
import EmailLogsTable from './EmailLogsTable';
import { EMAIL_LOGS_TABLE, EMAIL_LOG_STATS, type EmailLogRow } from './queries';

interface Stats {
  days: number;
  sent: number;
  skipped: number;
  failed: number;
  total: number;
  all_time_total: number;
}

/**
 * Email Logs — one row per attempt, including the ones that never left.
 *
 * A mail provider's dashboard can only show what reached it. The rows worth
 * having here are the others: a template switched off, a recipient with no
 * address, a provider refusal. Those have no record anywhere else, and they are
 * exactly what "the customer says they never got the email" turns out to be.
 */
export default function EmailLogsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const clearSelectionRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<EmailLogRow>(client, EMAIL_LOGS_TABLE, 'emailLogsTable');
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<EmailLogRow[]>([]);
  const [quick, setQuick] = useState<QuickFilterState>(EMPTY_QUICK_FILTERS);
  // Compared by value by the table, so it must not be a fresh array each render.
  const externalFilters = useMemo(() => quickFiltersToTable(quick), [quick]);
  // Stable, so the table does not re-register its row handler on every render.
  const openRow = useCallback((row: EmailLogRow) => setOpenId(row.id), []);
  const closeRow = useCallback(() => setOpenId(null), []);
  // A fresh object each render would make the grid reconfigure selection mid-tick.
  const selection = useMemo(() => ({ onChange: setSelected, clearRef: clearSelectionRef }), []);
  // Clearing goes through the grid; it echoes the empty selection back to `selected`.
  const clearSelection = useCallback(() => clearSelectionRef.current?.(), []);
  const { user } = useUserData();
  const { data, refetch: refetchStats } = useQuery<{ emailLogStats: Stats }>(EMAIL_LOG_STATS, {
    variables: { days: 7 },
    fetchPolicy: 'cache-and-network',
  });
  const stats = data?.emailLogStats;

  // The stats are re-read too. `all_time_total` is the only number the delete-
  // everything confirm states, and neither mutation touches a normalised entity, so
  // Apollo would go on serving the pre-delete count — the confirm would promise one
  // figure and remove another, which is the exact thing an unscoped delete exists to
  // avoid.
  const afterDelete = useCallback(() => {
    clearSelectionRef.current?.();
    refetchRef.current?.();
    refetchStats().catch(() => undefined);
  }, [refetchStats]);

  // deleteAllEmailLogs is SUPER_ADMIN-only on the server, and its confirm exists
  // to state the scale — so the button waits for the count rather than offering a
  // wipe it cannot describe.
  const isSuperAdmin = user?.roles?.includes(SUPER_ROLE) ?? false;
  const deleteAllAction =
    isSuperAdmin && stats ? (
      <EmailLogDeleteAllButton total={stats.all_time_total} onDeleted={afterDelete} />
    ) : undefined;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Email Logs
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Every email the product tried to send — including the ones it decided not to, and the
            ones that failed before reaching a provider.
          </Typography>
        </Box>
        {stats && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              last {stats.days} days
            </Typography>
            <Chip size="small" color="success" label={`${stats.sent} sent`} />
            <Chip size="small" color="warning" label={`${stats.skipped} skipped`} />
            <Chip size="small" color="error" label={`${stats.failed} failed`} />
          </Stack>
        )}
      </Stack>

      <EmailLogBulkBar selected={selected} onClear={clearSelection} onDeleted={afterDelete} />
      <EmailLogQuickFilters value={quick} onChange={setQuick} />
      <EmailLogsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onRowClick={openRow}
        externalFilters={externalFilters}
        selection={selection}
        toolbarActions={deleteAllAction}
      />
      <EmailLogDrawer logId={openId} onClose={closeRow} />
    </Box>
  );
}
