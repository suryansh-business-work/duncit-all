import { useMemo, type MutableRefObject } from 'react';
import { useApolloClient } from '@apollo/client';
import { Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import {
  DuncitTable,
  dateColumn,
  useApolloTableFetch,
  type DuncitColumn,
  type TableFilterValue,
} from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { formatMoney } from '@duncit/utils';
import { POD_STATUS_COLORS, usePodStatusLabels } from './pod-status';
import { POD_EXPENSE_PODS_TABLE, type PodExpensePodRow } from './queries';

const getPodRowId = (row: PodExpensePodRow) => row.pod_doc_id;

const renderPod = (row: PodExpensePodRow) => (
  <Stack
    component="span"
    sx={{
      alignItems: "flex-start",
      lineHeight: 1.2
    }}>
    <Typography variant="body2" component="span" noWrap sx={{
      fontWeight: 700
    }}>
      {row.pod_title}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {row.pod_code}
    </Typography>
  </Stack>
);

interface Props {
  currency: string;
  externalFilters: readonly TableFilterValue[];
  refetchRef: MutableRefObject<(() => void) | null>;
  onRowClick: (row: PodExpensePodRow) => void;
}

/** Every pod, with what Duncit has spent on it. Click a row to record a bill. */
export default function PodExpensePodsTable({
  currency,
  externalFilters,
  refetchRef,
  onRowClick,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const statusLabels = usePodStatusLabels();
  const fetchRows = useApolloTableFetch<PodExpensePodRow>(
    client,
    POD_EXPENSE_PODS_TABLE,
    'podExpensePodsTable',
  );

  const columns = useMemo<DuncitColumn<PodExpensePodRow>[]>(() => {
    const money = (value: number) =>
      formatMoney(value, { symbol: currency, decimals: 2, grouping: false });
    const renderStatus = (row: PodExpensePodRow) => (
      <StatusChip
        status={row.pod_status}
        colorMap={POD_STATUS_COLORS}
        label={statusLabels[row.pod_status]}
      />
    );
    const renderBills = (row: PodExpensePodRow) => {
      const missing = row.expense_count - row.bill_count;
      return (
        <Typography
          variant="body2"
          component="span"
          color={missing > 0 ? 'warning.main' : 'text.primary'}
        >
          {row.bill_count} / {row.expense_count}
        </Typography>
      );
    };
    const renderTotal = (row: PodExpensePodRow) => (
      <Typography variant="body2" component="span" sx={{
        fontWeight: 700
      }}>
        {money(row.expense_total)}
      </Typography>
    );
    return [
      {
        field: 'pod_title',
        headerName: t('finance.common.pod'),
        flex: 1,
        minWidth: 220,
        cellRenderer: renderPod,
        valueGetter: (row) => row.pod_title,
      },
      dateColumn<PodExpensePodRow>({
        field: 'pod_date_time',
        headerName: t('finance.podExpense.podDate'),
        hide: false,
        width: 130,
      }),
      {
        field: 'pod_status',
        headerName: t('shell.common.status'),
        sortable: false,
        width: 130,
        cellRenderer: renderStatus,
        valueGetter: (row) => statusLabels[row.pod_status],
      },
      {
        field: 'expense_count',
        headerName: t('finance.podExpense.entries'),
        width: 110,
        valueGetter: (row) => row.expense_count,
      },
      {
        field: 'bill_count',
        headerName: t('finance.podExpense.bills'),
        width: 110,
        cellRenderer: renderBills,
        valueGetter: (row) => `${row.bill_count} / ${row.expense_count}`,
      },
      {
        field: 'expense_total',
        headerName: t('finance.podExpense.totalSpent'),
        width: 140,
        filter: { type: 'number' },
        cellRenderer: renderTotal,
        valueGetter: (row) => money(row.expense_total),
      },
      dateColumn<PodExpensePodRow>({
        field: 'last_expense_at',
        headerName: t('finance.podExpense.lastExpense'),
        width: 140,
        filterable: false,
      }),
    ];
  }, [currency, statusLabels, t]);

  return (
    <DuncitTable<PodExpensePodRow>
      tableId="finance-pod-expenses"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPodRowId}
      onRowClick={onRowClick}
      externalFilters={externalFilters}
      emptyText={t('finance.podExpense.noPodsMatchTheseFilters')}
      defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
      searchPlaceholder={t('finance.podExpense.searchPods')}
      refetchRef={refetchRef}
    />
  );
}
