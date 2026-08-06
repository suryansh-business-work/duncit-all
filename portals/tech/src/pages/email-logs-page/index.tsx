import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import EmailLogDrawer from './EmailLogDrawer';
import EmailLogsTable from './EmailLogsTable';
import { EMAIL_LOGS_TABLE, EMAIL_LOG_STATS, type EmailLogRow } from './queries';

interface Stats {
  days: number;
  sent: number;
  skipped: number;
  failed: number;
  total: number;
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
  const fetchRows = useApolloTableFetch<EmailLogRow>(client, EMAIL_LOGS_TABLE, 'emailLogsTable');
  const [openId, setOpenId] = useState<string | null>(null);
  // Stable, so the table does not re-register its row handler on every render.
  const openRow = useCallback((row: EmailLogRow) => setOpenId(row.id), []);
  const closeRow = useCallback(() => setOpenId(null), []);
  const { data } = useQuery<{ emailLogStats: Stats }>(EMAIL_LOG_STATS, {
    variables: { days: 7 },
    fetchPolicy: 'cache-and-network',
  });
  const stats = data?.emailLogStats;

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

      <EmailLogsTable fetchRows={fetchRows} refetchRef={refetchRef} onRowClick={openRow} />
      <EmailLogDrawer logId={openId} onClose={closeRow} />
    </Box>
  );
}
