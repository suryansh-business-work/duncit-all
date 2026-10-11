import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate, useSearchParams } from 'react-router';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { refundColumns } from './refundColumns';
import { DELETION_REFUNDS_TABLE, type DeletionRefundRow } from './refundQueries';

const getRowId = (row: DeletionRefundRow) => row.id;
const PAGE_PATH = '/deletion-requests/refunds';

/**
 * Products › Delete Requests › Deletion Refunds.
 *
 * Every order a deletion request cancelled ("cancel all running orders now and
 * refund buyers in full"), one row per order: the buyer, what goes back to the
 * original payment and as coins, and where the refund stands. The review
 * dialog of a request links here with `?request=<id>&no=<number>` for the
 * orders of that request. A row opens the order, where a refused refund can be
 * retried. The table downloads as CSV from its own toolbar.
 */
export default function DeletionRefundsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const formatter = useDateFormat();
  const [params] = useSearchParams();
  const requestId = params.get('request');
  const requestNo = params.get('no') ?? '';

  const fetchRows = useApolloTableFetch<DeletionRefundRow>(
    client,
    DELETION_REFUNDS_TABLE,
    'deletionRefundsTable',
    { extraVariables: { request_id: requestId } },
    [requestId],
  );
  const columns = useMemo(() => refundColumns(t, formatter), [t, formatter]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
          {t('products.deletionRefunds.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('products.deletionRefunds.description')}
        </Typography>
      </Box>
      {requestId && (
        <Alert severity="info">
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{t('products.deletionRefunds.requestFilter', { vars: { request: requestNo } })}</span>
            <Chip size="small" label={t('products.deletionRequests.clearFilter')} onDelete={() => navigate(PAGE_PATH)} />
          </Stack>
        </Alert>
      )}
      <DuncitTable<DeletionRefundRow>
        ariaLabel={t('products.deletionRefunds.title')}
        tableId="products-deletion-refunds"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
        emptyText={t('products.deletionRefunds.empty')}
        defaultSort={{ field: 'cancelled_at', dir: 'desc' }}
        searchPlaceholder={t('products.deletionRefunds.search')}
      />
    </Stack>
  );
}
