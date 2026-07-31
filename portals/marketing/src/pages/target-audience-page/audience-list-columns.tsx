import { Chip, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { actionsColumn, dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { AudienceListRow } from './helpers';

const renderList = (row: AudienceListRow) => (
  <Stack spacing={0} sx={{ lineHeight: 1.3 }}>
    <Typography variant="body2" fontWeight={700} noWrap>
      {row.name}
    </Typography>
    <Typography variant="caption" color="text.secondary" noWrap>
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
      <Typography variant="body2" color="text.secondary">
        Everyone
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
}: Readonly<ColumnDeps>): DuncitColumn<AudienceListRow>[] {
  return [
    {
      field: 'name',
      headerName: 'List',
      minWidth: 260,
      flex: 1,
      cellRenderer: renderList,
      valueGetter: (row) => row.name,
    },
    {
      field: 'owner',
      headerName: 'Owner',
      filter: { type: 'text' },
      minWidth: 160,
      valueGetter: (row) => row.owner,
    },
    {
      field: 'member_count',
      headerName: 'People',
      sortable: false,
      width: 120,
      cellRenderer: renderMembers,
      valueGetter: (row) => row.member_count,
    },
    {
      field: 'criteria',
      headerName: 'Criteria',
      sortable: false,
      width: 130,
      cellRenderer: renderCriteria,
      valueGetter: (row) => row.filters.length,
    },
    dateColumn<AudienceListRow>({
      field: 'created_at',
      headerName: 'Created',
      hide: false,
      width: 160,
      formatDate,
    }),
    actionsColumn<AudienceListRow>({
      width: 80,
      onDelete,
      delete: { title: 'Delete list', icon: <DeleteOutlineIcon fontSize="small" /> },
    }),
  ];
}
