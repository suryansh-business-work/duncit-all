import { Chip, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { actionsColumn, dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { AudienceListRow } from './helpers';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

const renderList = (row: AudienceListRow) => (
  <Stack spacing={0} sx={{ lineHeight: 1.3 }}>
    <Typography variant="body2" noWrap sx={{
      fontWeight: 700
    }}>
      {row.name}
    </Typography>
    <Typography variant="caption" noWrap sx={{
      color: "text.secondary"
    }}>
      {row.description || EM_DASH}
    </Typography>
  </Stack>
);

const renderMembers = (row: AudienceListRow) => (
  <Chip
    size="small"
    color={row.member_count > 0 ? 'primary' : 'default'}
    variant="outlined"
    label={row.member_count.toLocaleString()}
  />
);

const renderCriteria = (row: AudienceListRow) => {
  const count = row.filters.length;
  if (count === 0) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>Everyone
              </Typography>
    );
  }
  return <Typography variant="body2">{`${count} filter${count === 1 ? '' : 's'}`}</Typography>;
};

interface ColumnDeps {
  formatDate: (date: Date) => string;
  onDelete: (row: AudienceListRow) => void;
}

export function getAudienceListColumns({
  formatDate,
  onDelete,
}: Readonly<ColumnDeps>, t: Translate): DuncitColumn<AudienceListRow>[] {
  return [
    {
      field: 'name',
      headerName: t('marketing.targetAudience.list'),
      minWidth: 260,
      flex: 1,
      cellRenderer: renderList,
      valueGetter: (row) => row.name,
    },
    {
      field: 'owner',
      headerName: t('marketing.targetAudience.owner'),
      filter: { type: 'text' },
      minWidth: 160,
      valueGetter: (row) => row.owner,
    },
    {
      field: 'member_count',
      headerName: t('marketing.common.people'),
      sortable: false,
      width: 120,
      cellRenderer: renderMembers,
      valueGetter: (row) => row.member_count,
    },
    {
      field: 'criteria',
      headerName: t('marketing.targetAudience.criteria'),
      sortable: false,
      width: 130,
      cellRenderer: renderCriteria,
      valueGetter: (row) => row.filters.length,
    },
    dateColumn<AudienceListRow>({
      field: 'created_at',
      headerName: t('shell.common.created'),
      hide: false,
      width: 160,
      formatDate,
    }),
    actionsColumn<AudienceListRow>({
      width: 80,
      onDelete,
      delete: { title: t('marketing.targetAudience.deleteList'), icon: <DeleteOutlineIcon fontSize="small" /> },
    }),
  ];
}
