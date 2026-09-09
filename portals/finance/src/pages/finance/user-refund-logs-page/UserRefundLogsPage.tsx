import { useCallback, useEffect, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { USER_REFUNDS_TABLE, type UserRefundRow } from './queries';
import UserRefundsTable from './UserRefundsTable';

const POLL_MS = 30000;

/**
 * Finance › User Refund Logs: every refund already paid back to a buyer.
 *
 * Read-only by design. A refund is raised where the decision is made — the
 * Payment Logs row, a pod cancellation, a Backout — and this page is the one
 * place they all land afterwards, so adding an action here would be a fifth way
 * to move money that none of those flows knows about.
 */
export default function UserRefundLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query<any>({
        query: USER_REFUNDS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.userRefundsTable.rows as UserRefundRow[],
        total: data.userRefundsTable.total as number,
      };
    },
    [client],
  );

  // Refunds land from four flows, three of which are not this screen — the same
  // live refresh Payment Logs runs keeps the log current without a reload.
  useEffect(() => {
    const timer = globalThis.setInterval(() => refetchRef.current?.(), POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, []);

  // The refund has no audit page of its own: what it reversed is the payment.
  const handleOpen = useCallback(
    (r: UserRefundRow) => navigate(`/payment-logs/${r.id}`),
    [navigate],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
        <UndoIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          {t('finance.refundLogs.title')}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {t('finance.refundLogs.subtitle')}
      </Typography>

      <UserRefundsTable fetchRows={fetchRows} refetchRef={refetchRef} onOpen={handleOpen} />
    </Box>
  );
}
