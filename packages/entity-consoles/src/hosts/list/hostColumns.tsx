import { Chip, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import type { DuncitColumn } from '@duncit/table';
import type { HostRow, HostStatus } from '../queries';

/**
 * The hosts list, as columns.
 *
 * Module scope so no cell is a component defined inside another (S6478), and a
 * factory over `t` because every header is copy (rule 38).
 */
type Translate = (key: string) => string;

const EMPTY = '—';

const STATUS_COLORS: Record<HostStatus, 'default' | 'warning' | 'success' | 'error'> = {
  DRAFT: 'default',
  SUBMITTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

export const statusLabels = (t: Translate): Record<HostStatus, string> => ({
  DRAFT: t('directory.hostEditor.statusDraft'),
  SUBMITTED: t('directory.hostEditor.statusSubmitted'),
  APPROVED: t('directory.hostEditor.statusApproved'),
  REJECTED: t('directory.hostEditor.statusRejected'),
});

/** The applicant, over the permanent HOST- id they are tracked by. */
const renderHost = (row: HostRow) => (
  <Stack spacing={0.25} component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="caption" component="span" sx={{ fontWeight: 700 }}>
      {row.full_name || EMPTY}
    </Typography>
    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
      {row.host_no || EMPTY}
    </Typography>
  </Stack>
);

const renderContact = (row: HostRow) => (
  <Stack spacing={0.25} component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="caption" component="span">
      {row.email || EMPTY}
    </Typography>
    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
      {row.phone || EMPTY}
    </Typography>
  </Stack>
);

const categoriesValue = (row: HostRow) =>
  row.host_categories
    ?.map((category) => category.sub_category_name || category.category_name)
    .filter(Boolean)
    .join(', ') || EMPTY;

const commissionValue = (row: HostRow, fallback: string) =>
  row.host_commission_pct ? `${row.host_commission_pct}%` : fallback;

export const hostColumns = (t: Translate): DuncitColumn<HostRow>[] => {
  const labels = statusLabels(t);
  const platformDefault = t('directory.hostEditor.commissionDefault');
  const renderStatus = (row: HostRow) => (
    <Chip size="small" color={STATUS_COLORS[row.status]} label={labels[row.status]} />
  );
  const renderActive = (row: HostRow) => (
    <Chip
      size="small"
      variant="outlined"
      color={row.is_active ? 'success' : 'default'}
      label={row.is_active ? t('directory.hostEditor.live') : t('directory.hostEditor.paused')}
    />
  );

  return [
    {
      field: 'full_name',
      headerName: t('directory.hostEditor.colHost'),
      filter: { type: 'text' },
      flex: 1,
      minWidth: 190,
      cellRenderer: renderHost,
      valueGetter: (row) => row.full_name,
    },
    {
      field: 'email',
      headerName: t('directory.hostEditor.colContact'),
      filter: { type: 'text' },
      flex: 1,
      minWidth: 200,
      cellRenderer: renderContact,
      valueGetter: (row) => row.email,
    },
    {
      field: 'host_categories',
      headerName: t('directory.hostEditor.colCategories'),
      sortable: false,
      flex: 1,
      minWidth: 180,
      valueGetter: categoriesValue,
    },
    {
      field: 'status',
      headerName: t('directory.hostEditor.colStatus'),
      filter: {
        type: 'select',
        options: (Object.keys(labels) as HostStatus[]).map((value) => ({
          value,
          label: labels[value],
        })),
      },
      width: 150,
      cellRenderer: renderStatus,
      valueGetter: (row) => row.status,
    },
    {
      field: 'is_active',
      headerName: t('directory.hostEditor.colLive'),
      filter: { type: 'boolean' },
      width: 120,
      cellRenderer: renderActive,
      valueGetter: (row) => (row.is_active ? 'true' : 'false'),
    },
    {
      field: 'host_commission_pct',
      headerName: t('directory.hostEditor.colCommission'),
      width: 150,
      valueGetter: (row) => commissionValue(row, platformDefault),
    },
    {
      field: 'created_at',
      headerName: t('directory.hostEditor.colApplied'),
      filter: { type: 'date' },
      minWidth: 170,
      valueGetter: (row) => formatDateTime(row.created_at),
    },
  ];
};
