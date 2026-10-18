import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Typography } from '@mui/material';
import { DuncitTable, actionsColumn, activeChipColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import type { GigCategoryRow } from './gig-category';

interface Props {
  fetchRows: TableFetch<GigCategoryRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions: ReactNode;
  onEdit: (row: GigCategoryRow) => void;
  onDelete: (row: GigCategoryRow) => void;
}

const getRowId = (row: GigCategoryRow) => row.id;

const renderExamples = (row: GigCategoryRow) => (
  <Typography variant="body2" component="span" color="text.secondary" noWrap>
    {row.examples.join(', ')}
  </Typography>
);

export default function GigCategoriesTable({ fetchRows, refetchRef, toolbarActions, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<GigCategoryRow>[]>(
    () => [
      { field: 'title', headerName: t('gigJobs.admin.columnTitle'), type: 'text', flex: 1, minWidth: 200 },
      {
        field: 'examples',
        headerName: t('gigJobs.admin.columnExamples'),
        type: 'text',
        flex: 2,
        minWidth: 260,
        sortable: false,
        filterable: false,
        cellRenderer: renderExamples,
        valueGetter: (row) => row.examples.join(', '),
      },
      { field: 'sort_order', headerName: t('gigJobs.admin.columnOrder'), type: 'number', width: 100 },
      activeChipColumn<GigCategoryRow>({ headerName: t('gigJobs.admin.columnActive') }),
      actionsColumn<GigCategoryRow>({ onEdit, onDelete }),
    ],
    [t, onEdit, onDelete],
  );

  return (
    <DuncitTable<GigCategoryRow>
      tableId="admin-gig-categories"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('gigJobs.admin.empty')}
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      searchPlaceholder={t('gigJobs.admin.search')}
      refetchRef={refetchRef}
    />
  );
}
