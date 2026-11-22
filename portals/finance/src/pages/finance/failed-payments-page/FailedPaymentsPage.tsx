import { useCallback, useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { DuncitTable, tableQueryToGql, type TableQueryState } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { buildFailedPaymentColumns } from './failedPaymentColumns';
import FailedPaymentRowActions from './FailedPaymentRowActions';
import FailedPaymentDialogs from './FailedPaymentDialogs';
import { failedPaymentRowStyle, useCanManageFailedPayments } from './rowStyle';
import { useFailedPaymentActions } from './useFailedPaymentActions';
import { FAILED_PAYMENTS_TABLE, type FailedPaymentRow, type FailedPaymentsTableData } from './queries';

const getRowId = (r: FailedPaymentRow) => r.id;

/**
 * Finance › Failed Payments: every Razorpay checkout that did not end in a
 * booking, newest first. Green rows were matched by the AI + Razorpay check and
 * can be refunded; yellow rows carry evidence a person must review first.
 */
export default function FailedPaymentsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const client = useApolloClient();
  const navigate = useNavigate();
  const canManage = useCanManageFailedPayments();
  const refetchRef = useRef<(() => void) | null>(null);
  // A decision changes the row's colour and buttons, so the page reloads after one.
  const reload = useCallback(() => refetchRef.current?.(), []);
  const actions = useFailedPaymentActions(reload);
  const { open } = actions;

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query<FailedPaymentsTableData>({
        query: FAILED_PAYMENTS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      const page = data?.failedPaymentsTable;
      return page ? { rows: page.rows, total: page.total } : { rows: [], total: 0 };
    },
    [client],
  );

  const columns = useMemo(
    () =>
      buildFailedPaymentColumns(t, (row) => (
        <FailedPaymentRowActions flags={row} canManage={canManage} onAction={(kind) => open(kind, row)} />
      )),
    [t, canManage, open],
  );
  const getRowStyle = useMemo(() => failedPaymentRowStyle(theme), [theme]);
  const openCase = useCallback((row: FailedPaymentRow) => navigate(`/failed-payments/${row.id}`), [navigate]);
  const title = t('finance.failedPayments.title');

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
        <ReportProblemIcon color="primary" />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          {title}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {t('finance.failedPayments.subtitle')}
      </Typography>
      {!canManage && (
        <Alert severity="info" sx={{ mb: 2 }} data-testid="failed-payments-read-only">
          {t('finance.failedPayments.readOnlyHint')}
        </Alert>
      )}

      <DuncitTable<FailedPaymentRow>
        ariaLabel={title}
        tableId="finance-failed-payments"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        getRowStyle={getRowStyle}
        onRowClick={openCase}
        emptyText={t('finance.failedPayments.empty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('finance.failedPayments.search')}
        refetchRef={refetchRef}
      />

      <FailedPaymentDialogs actions={actions} />
    </Box>
  );
}
