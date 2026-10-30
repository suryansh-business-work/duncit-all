import { useCallback, useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, EM_DASH, useApolloTableFetch, type DuncitColumn, type TableFilterValue } from '@duncit/table';
import { makeStatusCell } from '../../unit/components/StatusChip';
import { describePath, firstLine, formatDuration } from '../../unit/format';
import { optionsOf } from '../../unit/labels';
import { describeBlocks, useScenarioStateLabels } from './labels';
import { E2E_SCENARIOS_TABLE, type E2eScenarioRow } from './queries';
import ScenarioDialog from './ScenarioDialog';

interface Props {
  runId: string;
  /** Pins the table to failed scenarios — the Failed tab. */
  failedOnly?: boolean;
}

const getRowId = (row: E2eScenarioRow) => row.id;
const FAILED_ONLY: TableFilterValue[] = [{ field: 'state', op: 'eq', value: 'FAILED' }];

/**
 * One row per scenario the run held — the ones a failed hook blocked included,
 * so a red setup reads as hundreds of scenarios that never ran rather than as
 * one failure among passes. A row opens the scenario's error in full.
 */
export default function ScenariosTable({ runId, failedOnly = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useScenarioStateLabels();
  const client = useApolloClient();
  const [open, setOpen] = useState<E2eScenarioRow | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const fetchRows = useApolloTableFetch<E2eScenarioRow>(
    client,
    E2E_SCENARIOS_TABLE,
    'e2eScenarioResultsTable',
    { extraVariables: { run_id: runId } },
    [runId]
  );

  const columns = useMemo<DuncitColumn<E2eScenarioRow>[]>(
    () => [
      { field: 'project', headerName: t('tech.e2eScenarios.colProject'), width: 140, type: 'text', valueGetter: (r) => r.project },
      { field: 'spec', headerName: t('tech.e2eScenarios.colSpec'), minWidth: 240, flex: 1, type: 'text', valueGetter: (r) => r.spec },
      {
        field: 'title_path',
        headerName: t('tech.e2eScenarios.colDescribe'),
        minWidth: 200,
        flex: 1,
        type: 'text',
        sortable: false,
        filterable: false,
        valueGetter: (r) => describePath(describeBlocks(r.title_path)),
      },
      { field: 'title', headerName: t('tech.e2eScenarios.colScenario'), minWidth: 260, flex: 2, type: 'text', valueGetter: (r) => r.title },
      {
        field: 'state',
        headerName: t('tech.e2eScenarios.colState'),
        width: 120,
        type: 'enum',
        options: optionsOf(labels),
        cellRenderer: makeStatusCell<E2eScenarioRow>(labels, (r) => r.state),
        valueGetter: (r) => labels[r.state],
      },
      {
        field: 'duration_ms',
        headerName: t('tech.e2eScenarios.colDuration'),
        width: 110,
        type: 'number',
        valueGetter: (r) => formatDuration(t, r.duration_ms),
      },
      {
        field: 'error',
        headerName: t('tech.e2eScenarios.colError'),
        minWidth: 260,
        flex: 2,
        hide: !failedOnly,
        type: 'text',
        sortable: false,
        filterable: false,
        valueGetter: (r) => (r.error ? firstLine(r.error) : EM_DASH),
      },
    ],
    [failedOnly, labels, t]
  );

  return (
    <>
      <DuncitTable<E2eScenarioRow>
        ariaLabel={failedOnly ? t('tech.e2eScenarios.tabFailedAria') : t('tech.e2eScenarios.tabAll')}
        tableId={failedOnly ? 'tests-e2e-run-failed-scenarios' : 'tests-e2e-run-scenarios'}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        externalFilters={failedOnly ? FAILED_ONLY : undefined}
        emptyText={failedOnly ? t('tech.e2eScenarios.emptyFailed') : t('tech.e2eScenarios.empty')}
        searchPlaceholder={t('tech.e2eScenarios.search')}
        defaultSort={{ field: 'project', dir: 'asc' }}
        onRowClick={setOpen}
      />
      <ScenarioDialog scenario={open} onClose={close} />
    </>
  );
}
