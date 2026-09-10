import { useMemo, type MutableRefObject } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { commissionLabel } from '../../utils/commissionLabel';
import LifecycleActions from '../../components/LifecycleActions';
import { categoryPath, isActiveClubAdmin, STATUS_OPTIONS, type ClubAdminRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  fetchRows: TableFetch<ClubAdminRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onEdit: (row: ClubAdminRow) => void;
  onReview: (row: ClubAdminRow) => void;
  canHardDelete: boolean;
  onToggleActive: (row: ClubAdminRow) => void;
  onDelete: (row: ClubAdminRow) => void;
}

const getRowId = (row: ClubAdminRow) => row.id;

const renderPerson = (row: ClubAdminRow) => (
  <Box>
    <Typography variant="body2" sx={{
      fontWeight: 700
    }}>
      {row.full_name || '—'}
    </Typography>
    <Typography
      variant="caption"
      sx={{
        color: "text.secondary",
        display: "block"
      }}>
      {row.email || row.phone || '—'}
    </Typography>
  </Box>
);

/** The full hierarchy, wrapped — a three-level path does not fit on one line. */
const renderCategory = (row: ClubAdminRow) => (
  <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
    {categoryPath(row)}
  </Typography>
);

/** Every assigned club, or a dash. Chips so a long list stays readable. */
const renderClubs = (row: ClubAdminRow) => {
  if (row.assigned_clubs.length === 0) return <Typography variant="body2">—</Typography>;
  return (
    <Stack
      direction="row"
      spacing={0.5}
      useFlexGap
      sx={{
        flexWrap: "wrap",
        py: 0.5
      }}>
      {row.assigned_clubs.map((club) => (
        <Chip key={club.id} size="small" variant="outlined" label={club.club_name} />
      ))}
    </Stack>
  );
};

const clubsValue = (row: ClubAdminRow) =>
  row.assigned_clubs.map((c) => c.club_name).join(', ') || '—';

const statusValue = (row: ClubAdminRow) => (isActiveClubAdmin(row) ? 'Active' : 'Inactive');

const renderStatus = (row: ClubAdminRow) => {
  const active = isActiveClubAdmin(row);
  return (
    <Chip
      size="small"
      variant="outlined"
      color={active ? 'success' : 'default'}
      label={active ? 'Active' : 'Inactive'}
    />
  );
};

const renderCommission = (row: ClubAdminRow) => (
  <Chip size="small" variant="outlined" label={commissionLabel(row.commission_pct)} />
);

export default function ClubAdminsTable({
  fetchRows,
  refetchRef,
  onEdit,
  onReview,
  canHardDelete,
  onToggleActive,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<ClubAdminRow>[]>(() => {
    const renderActions = (row: ClubAdminRow) => (
      <>
        <Tooltip title={t('shell.common.edit')}>
          <DuncitIconButton size="small" onClick={() => onEdit(row)}>
            <EditIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <Tooltip title={t('onboarding.common.review')}>
          <DuncitIconButton size="small" onClick={() => onReview(row)}>
            <RateReviewIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <LifecycleActions
          active={row.is_active !== false}
          onToggleActive={() => onToggleActive(row)}
          canHardDelete={canHardDelete}
          onDelete={() => onDelete(row)}
        />
      </>
    );

    return [
      {
        field: 'club_admin_no',
        headerName: t('onboarding.clubAdmins.clubAdminId'),
        width: 140,
        valueGetter: (row) => row.club_admin_no || '—',
      },
      {
        field: 'full_name',
        headerName: t('onboarding.common.clubAdmin'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderPerson,
        valueGetter: (row) => row.full_name || '—',
      },
      {
        field: 'category',
        headerName: t('onboarding.common.category'),
        sortable: false,
        minWidth: 220,
        cellRenderer: renderCategory,
        valueGetter: categoryPath,
      },
      {
        field: 'assigned_clubs',
        headerName: t('onboarding.clubAdmins.assignedClubs2'),
        sortable: false,
        minWidth: 200,
        cellRenderer: renderClubs,
        valueGetter: clubsValue,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 120,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: statusValue,
      },
      dateColumn<ClubAdminRow>({
        field: 'joined_at',
        headerName: t('onboarding.clubAdmins.dateJoined2'),
        width: 135,
      }),
      {
        field: 'commission_pct',
        headerName: t('onboarding.clubAdmins.payCommission2'),
        width: 150,
        filter: { type: 'number' },
        cellRenderer: renderCommission,
        valueGetter: (row) => commissionLabel(row.commission_pct),
      },
      { field: 'phone', headerName: t('shell.common.phone'), hide: true, minWidth: 140 },
      { field: 'actions', headerName: t('shell.common.actions'), sortable: false, width: 170, cellRenderer: renderActions },
    ];
  }, [onEdit, onReview, canHardDelete, onToggleActive, onDelete]);

  return (
    <DuncitTable<ClubAdminRow>
      tableId="onboarding-club-admins"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('onboarding.clubAdmins.noClubAdminsOnboardedYet')}
      defaultSort={{ field: 'joined_at', dir: 'desc' }}
      searchPlaceholder="Search ID, name, email or phone"
      refetchRef={refetchRef}
    />
  );
}
