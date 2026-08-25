import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
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
    <Typography variant="body2" component="div" sx={{
      fontWeight: 700
    }}>
      {c.name}
    </Typography>
    {c.description && (
      <Typography
        variant="caption"
        component="div"
        noWrap
        sx={{
          color: "text.secondary",
          maxWidth: 320
        }}>
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
  const { t } = useTranslation();
  const superOptions = useLevelOptions('SUPER');
  const categoryOptions = useLevelOptions('CATEGORY');
  const subOptions = useLevelOptions('SUB');

  // The headers come from the active catalogue, so `t` belongs in the deps —
  // without it the table would keep the language it first rendered in.
  const columns = useMemo<DuncitColumn<Challenge>[]>(() => {
    return [
      {
        field: 'name',
        headerName: t('challenge.table.colName'),
        flex: 1,
        minWidth: 220,
        cellRenderer: renderName,
        valueGetter: (c) => c.name,
      },
      {
        field: 'super_category_id',
        headerName: t('challenge.table.colSuperCategory'),
        minWidth: 150,
        filter: { type: 'select', options: superOptions },
        valueGetter: (c) => dash(c.super_category_name),
      },
      {
        field: 'category_id',
        headerName: t('challenge.table.colCategory'),
        minWidth: 150,
        filter: { type: 'select', options: categoryOptions },
        valueGetter: (c) => dash(c.category_name),
      },
      {
        field: 'sub_category_id',
        headerName: t('challenge.table.colSubCategory'),
        minWidth: 150,
        filter: { type: 'select', options: subOptions },
        valueGetter: (c) => dash(c.sub_category_name),
      },
      activeChipColumn<Challenge>({ width: 120, outlineInactive: true }),
      dateColumn<Challenge>(),
      actionsColumn<Challenge>({
        onEdit,
        onDelete,
        edit: { ariaLabel: t('challenge.table.editAria') },
        delete: { ariaLabel: t('challenge.table.deleteAria') },
      }),
    ];
  }, [onEdit, onDelete, superOptions, categoryOptions, subOptions, t]);

  return (
    <DuncitTable<Challenge>
      tableId="challenge-portal-challenges"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getChallengeRowId}
      toolbarActions={toolbarActions}
      emptyText={t('challenge.table.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('challenge.table.search')}
      refetchRef={refetchRef}
    />
  );
}
