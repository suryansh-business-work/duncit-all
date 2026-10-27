import { useCallback, useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, EM_DASH, useApolloTableFetch, type DuncitColumn, type TableFilterValue } from '@duncit/table';
import { makeStatusCell } from '../components/StatusChip';
import { describePath, firstLine, formatDuration } from '../format';
import { optionsOf, useUnitLabels } from '../labels';
import { UNIT_CASES_TABLE, type UnitCaseRow } from '../queries';
import CaseDialog from './CaseDialog';

interface Props {
  runId: string;
  /** Pins the table to failed tests — the Failures tab. */
  failuresOnly?: boolean;
}

const getRowId = (row: UnitCaseRow) => row.id;
const FAILED_ONLY: TableFilterValue[] = [{ field: 'status', op: 'eq', value: 'FAILED' }];

/**
 * One row per test: where it lives, the describe blocks around it, its own
 * description, and how it went. A row opens the whole failure message.
 */
export default function CasesTab({ runId, failuresOnly = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useUnitLabels();
  const client = useApolloClient();
  const [open, setOpen] = useState<UnitCaseRow | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const fetchRows = useApolloTableFetch<UnitCaseRow>(
    client,
    UNIT_CASES_TABLE,
    'unitTestCasesTable',
    { extraVariables: { run_id: runId } },
    [runId]
  );

  const columns = useMemo<DuncitColumn<UnitCaseRow>[]>(
    () => [
      { field: 'workspace', headerName: t('testsUnit.col.workspace'), width: 160, type: 'text', valueGetter: (r) => r.workspace },
      { field: 'file', headerName: t('testsUnit.col.file'), minWidth: 260, flex: 1, type: 'text', valueGetter: (r) => r.file },
      {
        field: 'ancestor_titles',
        headerName: t('testsUnit.col.describe'),
        minWidth: 200,
        flex: 1,
        type: 'text',
        sortable: false,
        filterable: false,
        valueGetter: (r) => describePath(r.ancestor_titles),
      },
      { field: 'title', headerName: t('testsUnit.col.test'), minWidth: 260, flex: 2, type: 'text', valueGetter: (r) => r.title },
      {
        field: 'status',
        headerName: t('testsUnit.col.status'),
        width: 120,
        type: 'enum',
        options: optionsOf(labels.caseStatus),
        cellRenderer: makeStatusCell<UnitCaseRow>(labels.caseStatus, (r) => r.status),
        valueGetter: (r) => labels.caseStatus[r.status],
      },
      {
        field: 'duration_ms',
        headerName: t('testsUnit.col.duration'),
        width: 110,
        type: 'number',
        valueGetter: (r) => formatDuration(t, r.duration_ms),
      },
      {
        field: 'failure_message',
        headerName: t('testsUnit.col.failure'),
        minWidth: 260,
        flex: 2,
        hide: !failuresOnly,
        type: 'text',
        sortable: false,
        filterable: false,
        valueGetter: (r) => (r.failure_message ? firstLine(r.failure_message) : EM_DASH),
      },
    ],
    [failuresOnly, labels, t]
  );

  return (
    <>
      <DuncitTable<UnitCaseRow>
        ariaLabel={failuresOnly ? t('testsUnit.tabs.failures') : t('testsUnit.tabs.cases')}
        tableId={failuresOnly ? 'tests-unit-run-failures' : 'tests-unit-run-cases'}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        externalFilters={failuresOnly ? FAILED_ONLY : undefined}
        emptyText={failuresOnly ? t('testsUnit.cases.noFailures') : t('testsUnit.cases.empty')}
        searchPlaceholder={t('testsUnit.cases.search')}
        defaultSort={{ field: 'workspace', dir: 'asc' }}
        onRowClick={setOpen}
      />
      <CaseDialog testCase={open} onClose={close} />
    </>
  );
}
