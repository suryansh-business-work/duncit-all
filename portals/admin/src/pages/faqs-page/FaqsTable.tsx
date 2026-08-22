import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { DuncitColumn, TableFetch } from '@duncit/table';
import FaqsTableBase, { type FaqRow } from '../../components/FaqsTableBase';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<FaqRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  supers: { id: string; name: string }[];
  toolbarActions?: ReactNode;
  onEdit: (row: FaqRow) => void;
  onDelete: (row: FaqRow) => void;
}

type Translate = ReturnType<typeof useTranslation>['t'];

const renderSuperCategory = (row: FaqRow, t: Translate) => {
  if (row.super_category) {
    return <Chip size="small" label={row.super_category.name} variant="outlined" />;
  }
  return <Chip size="small" label={t('admin.faqs.general')} />;
};

export default function FaqsTable({
  fetchRows,
  refetchRef,
  supers,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const entityColumn = useMemo<DuncitColumn<FaqRow>>(
    () => ({
      field: 'super_category_id',
      headerName: t('admin.dashboard.superCategory'),
      filter: {
        type: 'select',
        options: supers.map((sc) => ({ value: sc.id, label: sc.name })),
      },
      minWidth: 170,
      cellRenderer: (row: FaqRow) => renderSuperCategory(row, t),
      valueGetter: (row) => row.super_category?.name ?? 'General',
    }),
    [supers],
  );

  return (
    <FaqsTableBase
      tableId="admin-faqs"
      fetchRows={fetchRows}
      refetchRef={refetchRef}
      entityColumn={entityColumn}
      toolbarActions={toolbarActions}
      emptyText='No FAQs yet. Click "New FAQ" to create the first one.'
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
