import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { CATEGORY_OPTIONS, type CategoryOption, type Challenge } from '../../graphql/challenges';

interface Props {
  fetchRows: TableFetch<Challenge>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (challenge: Challenge) => void;
  onDelete: (challenge: Challenge) => void;
}

const getChallengeRowId = (c: Challenge) => c.id;

const dash = (v?: string | null) => v || '—';

const renderName = (c: Challenge) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="div">
      {c.name}
    </Typography>
    {c.description && (
      <Typography variant="caption" color="text.secondary" component="div" sx={{ maxWidth: 320 }} noWrap>
        {c.description}
      </Typography>
    )}
  </Box>
);

const renderStatus = (c: Challenge) => (
  <Chip
    size="small"
    color={c.is_active ? 'success' : 'default'}
    label={c.is_active ? 'Active' : 'Inactive'}
    variant={c.is_active ? 'filled' : 'outlined'}
  />
);

const createdValue = (c: Challenge) =>
  c.created_at ? format(new Date(c.created_at), 'd MMM yyyy') : '—';

/** id/name select-filter options for one category level. */
function useLevelOptions(level: 'SUPER' | 'CATEGORY' | 'SUB') {
  const { data } = useQuery<{ categories: CategoryOption[] }>(CATEGORY_OPTIONS, {
    variables: { filter: { level } },
  });
  return useMemo(
    () => (data?.categories ?? []).map((c) => ({ value: c.id, label: c.name })),
    [data],
  );
}

export default function ChallengesTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const superOptions = useLevelOptions('SUPER');
  const categoryOptions = useLevelOptions('CATEGORY');
  const subOptions = useLevelOptions('SUB');

  const columns = useMemo<DuncitColumn<Challenge>[]>(() => {
    const renderActions = (c: Challenge) => (
      <Stack direction="row" spacing={0.5} justifyContent="flex-end" component="span">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(c)} aria-label="Edit challenge">
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(c)} aria-label="Delete challenge">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
    return [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 220,
        cellRenderer: renderName,
        valueGetter: (c) => c.name,
      },
      {
        field: 'super_category_id',
        headerName: 'Super category',
        sortable: false,
        minWidth: 150,
        filter: { type: 'select', options: superOptions },
        valueGetter: (c) => dash(c.super_category_name),
      },
      {
        field: 'category_id',
        headerName: 'Category',
        sortable: false,
        minWidth: 150,
        filter: { type: 'select', options: categoryOptions },
        valueGetter: (c) => dash(c.category_name),
      },
      {
        field: 'sub_category_id',
        headerName: 'Sub-category',
        sortable: false,
        minWidth: 150,
        filter: { type: 'select', options: subOptions },
        valueGetter: (c) => dash(c.sub_category_name),
      },
      {
        field: 'is_active',
        headerName: 'Status',
        width: 120,
        filter: { type: 'boolean' },
        cellRenderer: renderStatus,
        valueGetter: (c) => (c.is_active ? 'Active' : 'Inactive'),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        filter: { type: 'date' },
        hide: true,
        width: 130,
        valueGetter: createdValue,
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [onEdit, onDelete, superOptions, categoryOptions, subOptions]);

  return (
    <DuncitTable<Challenge>
      tableId="challenge-portal-challenges"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getChallengeRowId}
      toolbarActions={toolbarActions}
      emptyText="No challenges yet. Create one with “New challenge”."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search challenges by name…"
      refetchRef={refetchRef}
    />
  );
}
