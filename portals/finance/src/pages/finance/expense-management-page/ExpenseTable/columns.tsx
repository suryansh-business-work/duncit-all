import { Chip, Link, Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import type { useTranslation } from '@duncit/app-settings';
import { formatMoney } from '@duncit/utils';
import {
  COMPENSATION_STATUSES,
  COMPENSATION_STATUS_COLORS,
  COMPENSATION_STATUS_KEYS,
  type useExpenseOptions,
  type CompensationStatus,
} from '../../expense-config';
import type { ExpenseRecord } from '../expense-form';

type ExpenseOptions = ReturnType<typeof useExpenseOptions>;

interface ColumnDeps {
  t: ReturnType<typeof useTranslation>['t'];
  currency: string;
  categories: ExpenseOptions;
  methods: ExpenseOptions;
  relatedTypes: ExpenseOptions;
}

/** The ledger columns; every label comes from the configured option lists. */
export function buildExpenseColumns({
  t,
  currency,
  categories,
  methods,
  relatedTypes,
}: Readonly<ColumnDeps>): DuncitColumn<ExpenseRecord>[] {
  const money = (value: number) =>
    formatMoney(value, { symbol: currency, decimals: 2, grouping: false });
  const optionRows = (result: typeof categories) =>
    result.options.map((option) => ({ value: option.key, label: option.label }));

  const renderCategory = (row: ExpenseRecord) => (
    <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
      <Chip size="small" label={categories.labelOf(row.category)} />
      {row.description ? (
        <Typography
          variant="caption"
          component="span"
          noWrap
          sx={{ color: 'text.secondary', maxWidth: 220 }}
        >
          {row.description}
        </Typography>
      ) : null}
    </Stack>
  );

  /** What the money was for: the entity, over the type it belongs to. */
  const renderRelated = (row: ExpenseRecord) => {
    if (!row.related_from_type) {
      return (
        <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
          {t('finance.expenseConfig.notAttributed')}
        </Typography>
      );
    }
    return (
      <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
        <Typography variant="body2" component="span" noWrap>
          {row.related_from_name || '—'}
        </Typography>
        <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
          {relatedTypes.labelOf(row.related_from_type)}
        </Typography>
      </Stack>
    );
  };

  const renderVendor = (row: ExpenseRecord) => (
    <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
      <Typography variant="body2" component="span">
        {row.vendor_name || '—'}
      </Typography>
      {row.attachment_url ? (
        <Link
          href={row.attachment_url}
          target="_blank"
          rel="noreferrer"
          variant="caption"
          onClick={(event) => event.stopPropagation()}
        >
          {t('finance.expenseConfig.receipt')}
        </Link>
      ) : null}
    </Stack>
  );

  const statusLabel = (row: ExpenseRecord) =>
    t(COMPENSATION_STATUS_KEYS[row.compensation_status as CompensationStatus]);
  const renderStatus = (row: ExpenseRecord) => (
    <StatusChip
      status={row.compensation_status}
      colorMap={COMPENSATION_STATUS_COLORS}
      label={statusLabel(row)}
    />
  );

  return [
    dateColumn<ExpenseRecord>({
      field: 'date',
      headerName: t('finance.common.date'),
      hide: false,
      width: 120,
    }),
    {
      field: 'category',
      headerName: t('finance.expenseManagement.category'),
      flex: 1,
      minWidth: 190,
      type: 'enum',
      options: optionRows(categories),
      cellRenderer: renderCategory,
      valueGetter: (row) => categories.labelOf(row.category),
    },
    {
      field: 'related_from_type',
      headerName: t('finance.expenseConfig.relatedFrom'),
      minWidth: 170,
      type: 'enum',
      options: optionRows(relatedTypes),
      cellRenderer: renderRelated,
      valueGetter: (row) => row.related_from_name || relatedTypes.labelOf(row.related_from_type),
    },
    {
      field: 'vendor_name',
      headerName: t('finance.expenseManagement.vendor'),
      minWidth: 150,
      type: 'text',
      cellRenderer: renderVendor,
      valueGetter: (row) => row.vendor_name || '—',
    },
    {
      field: 'paid_by',
      headerName: t('finance.expenseConfig.paidBy'),
      width: 140,
      hide: true,
      type: 'text',
      valueGetter: (row) => row.paid_by || '—',
    },
    {
      field: 'payment_method',
      headerName: t('finance.expenseManagement.method'),
      width: 140,
      hide: true,
      type: 'enum',
      options: optionRows(methods),
      valueGetter: (row) => methods.labelOf(row.payment_method),
    },
    {
      field: 'amount',
      headerName: t('finance.expenseManagement.gross'),
      width: 110,
      type: 'number',
      valueGetter: (row) => money(row.amount),
    },
    {
      field: 'compensated_amount',
      headerName: t('finance.expenseConfig.compensated'),
      width: 130,
      type: 'number',
      valueGetter: (row) => money(row.compensated_amount),
    },
    {
      field: 'compensation_status',
      headerName: t('finance.expenseConfig.compensationStatus'),
      width: 170,
      type: 'enum',
      options: COMPENSATION_STATUSES.map((status) => ({
        value: status,
        label: t(COMPENSATION_STATUS_KEYS[status]),
      })),
      cellRenderer: renderStatus,
      valueGetter: statusLabel,
    },
    {
      field: 'net_amount',
      headerName: t('finance.expenseManagement.net'),
      type: 'number',
      // amount minus the refunds array's sum, computed per row — no stored path.
      sortable: false,
      filterable: false,
      width: 110,
      valueGetter: (row) => money(row.net_amount),
    },
    dateColumn<ExpenseRecord>({
      field: 'created_at',
      headerName: t('shell.common.created'),
      width: 120,
    }),
  ];
}
