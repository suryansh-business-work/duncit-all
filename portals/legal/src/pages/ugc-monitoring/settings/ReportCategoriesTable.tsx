import { useMemo, type RefObject } from 'react';
import { Stack, Typography } from '@mui/material';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import type { ReportCategory } from '../../../graphql/reports';

interface Props {
  fetchRows: TableFetch<ReportCategory>;
  refetchRef: RefObject<(() => void) | null>;
  formatDateTime: (value: Date) => string;
  onEdit: (category: ReportCategory) => void;
  onDelete: (category: ReportCategory) => void;
}

const getRowId = (c: ReportCategory) => c.id;

/**
 * The report categories, in the order the report dialog shows them.
 *
 * Sorted by position by default so the table is a preview of that dialog: what
 * is first here is what a person reads first when they tap Report.
 */
export default function ReportCategoriesTable({
  fetchRows,
  refetchRef,
  formatDateTime,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<ReportCategory>[]>(() => {
    const renderCategory = (c: ReportCategory) => (
      <Stack sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
          {c.label}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {c.description}
        </Typography>
      </Stack>
    );

    const needsDetails = (c: ReportCategory) =>
      t(c.requires_details ? 'reportLogs.needsDetailsYes' : 'reportLogs.needsDetailsNo');

    // Sort and filter keys are allowlisted on the server (CATEGORY_TABLE_CONFIG).
    return [
      {
        field: 'sort_order',
        headerName: t('shell.common.order'),
        width: 100,
        type: 'number',
        filterable: false,
      },
      {
        field: 'label',
        headerName: t('reportLogs.colCategory'),
        flex: 1,
        minWidth: 260,
        type: 'text',
        filterable: false,
        cellRenderer: renderCategory,
      },
      {
        field: 'requires_details',
        headerName: t('reportLogs.colNeedsDetails'),
        width: 210,
        type: 'boolean',
        valueGetter: needsDetails,
      },
      activeChipColumn<ReportCategory>({ headerName: t('reportLogs.colShown'), width: 140 }),
      dateColumn<ReportCategory>({
        field: 'updated_at',
        headerName: t('shell.common.updated'),
        hide: false,
        minWidth: 180,
        filterable: false,
        formatDate: formatDateTime,
      }),
      actionsColumn<ReportCategory>({
        onEdit,
        onDelete,
        // Named per row: a tooltip becomes the button's accessible name.
        edit: { title: (c) => t('shell.a11y.editNamed', { vars: { name: c.label } }) },
        delete: { title: (c) => t('shell.a11y.deleteNamed', { vars: { name: c.label } }) },
      }),
    ];
  }, [formatDateTime, onDelete, onEdit, t]);

  return (
    <DuncitTable<ReportCategory>
      tableId="legal-ugc-report-categories"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onEdit}
      emptyText={t('reportLogs.categoriesEmpty')}
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      searchPlaceholder={t('reportLogs.categorySearch')}
      refetchRef={refetchRef}
    />
  );
}
