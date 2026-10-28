import { useCallback, useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Typography } from '@mui/material';
import type { RegressionBucket } from '@duncit/gql-types';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, EM_DASH, useApolloTableFetch, type DuncitColumn, type TableFilterValue } from '@duncit/table';
import TestDialog from '../../unit/components/TestDialog';
import { firstLine } from '../../unit/format';
import { REGRESSION_ITEMS_TABLE, type RegressionItemRow } from '../queries';

interface Props {
  reportId: string;
  bucket: RegressionBucket;
  /** The bucket's name, for the table's accessible label. */
  label: string;
}

const getRowId = (row: RegressionItemRow) => row.id;

/** One bucket's tests, read from the server, one row per test; a row opens its failure. */
export default function ItemsTable({ reportId, bucket, label }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [open, setOpen] = useState<RegressionItemRow | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const fetchRows = useApolloTableFetch<RegressionItemRow>(
    client,
    REGRESSION_ITEMS_TABLE,
    'regressionReportItemsTable',
    { extraVariables: { report_id: reportId } },
    [reportId]
  );
  const pinned = useMemo<TableFilterValue[]>(() => [{ field: 'bucket', op: 'eq', value: bucket }], [bucket]);

  const columns = useMemo<DuncitColumn<RegressionItemRow>[]>(
    () => [
      { field: 'workspace', headerName: t('testsUnit.col.workspace'), width: 170, type: 'text', valueGetter: (r) => r.workspace },
      { field: 'file', headerName: t('testsUnit.col.file'), minWidth: 260, flex: 1, type: 'text', valueGetter: (r) => r.file },
      { field: 'full_name', headerName: t('testsUnit.col.test'), minWidth: 300, flex: 2, type: 'text', valueGetter: (r) => r.full_name },
      {
        field: 'failure_message',
        headerName: t('testsUnit.col.failure'),
        minWidth: 240,
        flex: 1,
        type: 'text',
        sortable: false,
        filterable: false,
        valueGetter: (r) => (r.failure_message ? firstLine(r.failure_message) : EM_DASH),
      },
    ],
    [t]
  );

  return (
    <>
      <DuncitTable<RegressionItemRow>
        ariaLabel={label}
        tableId="tests-regression-items"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        externalFilters={pinned}
        emptyText={t('testsUnit.regression.bucketEmpty')}
        searchPlaceholder={t('testsUnit.cases.search')}
        defaultSort={{ field: 'workspace', dir: 'asc' }}
        onRowClick={setOpen}
      />
      {open && (
        <TestDialog
          open
          onClose={close}
          title={open.title || open.full_name}
          workspace={open.workspace}
          file={open.file}
          failure={open.failure_message}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {open.full_name}
          </Typography>
        </TestDialog>
      )}
    </>
  );
}
