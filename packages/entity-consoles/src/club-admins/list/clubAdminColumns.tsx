import { Chip, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import type { DuncitColumn } from '@duncit/table';
import type { ClubAdminRow, ClubAdminStatus } from '../queries';

/**
 * The club admins list, as columns.
 *
 * Module scope so no cell is a component defined inside another (S6478), and a
 * factory over `t` because every header is copy (rule 38).
 */
type Translate = (key: string) => string;

const EMPTY = '—';

const STATUS_COLORS: Record<ClubAdminStatus, 'default' | 'success' | 'error'> = {
  DRAFT: 'default',
  APPROVED: 'success',
  REJECTED: 'error',
};

export const clubAdminStatusLabels = (t: Translate): Record<ClubAdminStatus, string> => ({
  DRAFT: t('directory.clubAdminEditor.statusDraft'),
  APPROVED: t('directory.venueEditor.statusApproved'),
  REJECTED: t('directory.venueEditor.statusRejected'),
});

const renderAdmin = (row: ClubAdminRow) => (
  <Stack spacing={0.25} component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="caption" component="span" sx={{ fontWeight: 700 }}>
      {row.full_name || EMPTY}
    </Typography>
    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
      {row.club_admin_no || EMPTY}
    </Typography>
  </Stack>
);

const renderContact = (row: ClubAdminRow) => (
  <Stack spacing={0.25} component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="caption" component="span">
      {row.email || EMPTY}
    </Typography>
    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
      {row.phone || EMPTY}
    </Typography>
  </Stack>
);

const clubsValue = (row: ClubAdminRow) =>
  row.assigned_clubs?.map((club) => club.club_name).join(', ') || EMPTY;

const categoryValue = (row: ClubAdminRow) =>
  [row.super_category, row.category, row.sub_category].filter(Boolean).join(' › ') || EMPTY;

export const clubAdminColumns = (t: Translate): DuncitColumn<ClubAdminRow>[] => {
  const labels = clubAdminStatusLabels(t);
  const platformDefault = t('directory.hostEditor.commissionDefault');

  const renderStatus = (row: ClubAdminRow) => (
    <Chip size="small" color={STATUS_COLORS[row.status]} label={labels[row.status]} />
  );
  const renderActive = (row: ClubAdminRow) => (
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
      headerName: t('directory.clubAdminEditor.colAdmin'),
      filter: { type: 'text' },
      flex: 1,
      minWidth: 190,
      cellRenderer: renderAdmin,
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
      field: 'assigned_clubs',
      headerName: t('directory.clubAdmins.assignedClubs'),
      sortable: false,
      flex: 1,
      minWidth: 180,
      valueGetter: clubsValue,
    },
    {
      field: 'category',
      headerName: t('directory.clubAdmins.category'),
      sortable: false,
      flex: 1,
      minWidth: 170,
      valueGetter: categoryValue,
    },
    {
      field: 'status',
      headerName: t('directory.hostEditor.colStatus'),
      filter: {
        type: 'select',
        options: (Object.keys(labels) as ClubAdminStatus[]).map((value) => ({
          value,
          label: labels[value],
        })),
      },
      width: 140,
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
      field: 'commission_pct',
      headerName: t('directory.hostEditor.colCommission'),
      width: 150,
      valueGetter: (row) => (row.commission_pct ? `${row.commission_pct}%` : platformDefault),
    },
    {
      field: 'joined_at',
      headerName: t('directory.clubAdmins.joinedAt'),
      filter: { type: 'date' },
      minWidth: 170,
      valueGetter: (row) => (row.joined_at ? formatDateTime(row.joined_at) : EMPTY),
    },
  ];
};
