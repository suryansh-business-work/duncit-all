import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Typography } from '@mui/material';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
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
        minWidth: 150,
        filter: { type: 'select', options: superOptions },
        valueGetter: (c) => dash(c.super_category_name),
      },
      {
        field: 'category_id',
        headerName: 'Category',
        minWidth: 150,
        filter: { type: 'select', options: categoryOptions },
        valueGetter: (c) => dash(c.category_name),
      },
      {
        field: 'sub_category_id',
        headerName: 'Sub-category',
        minWidth: 150,
        filter: { type: 'select', options: subOptions },
        valueGetter: (c) => dash(c.sub_category_name),
      },
      activeChipColumn<Challenge>({ width: 120, outlineInactive: true }),
      dateColumn<Challenge>(),
      actionsColumn<Challenge>({
        onEdit,
        onDelete,
        edit: { ariaLabel: 'Edit challenge' },
        delete: { ariaLabel: 'Delete challenge' },
      }),
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
