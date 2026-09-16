import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, actionsColumn, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { getRowId, namedActions, renderNameCell } from '../cells';
import type { E2eSubFlow } from '../queries';
import { makeRenderReview, reviewLabels, reviewOptions } from '../review';

interface Props {
  subFlows: E2eSubFlow[];
  toolbarActions: ReactNode;
  onOpen: (row: E2eSubFlow) => void;
  onDelete: (row: E2eSubFlow) => void;
}

/** A sub flow matches on its name, its description and any of its steps. */
const searchOf = (row: E2eSubFlow) =>
  [row.name, row.description, ...row.steps.flatMap((step) => [step.action, step.expected])].join(
    ' '
  );

/** The flow's sub flows, in the order they were added. A row opens its steps. */
export default function SubFlowsTable({
  subFlows,
  toolbarActions,
  onOpen,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const refetchRef = useRef<(() => void) | null>(null);
  const columns = useMemo<DuncitColumn<E2eSubFlow>[]>(() => {
    const labels = reviewLabels(t);
    return [
      {
        field: 'name',
        headerName: t('shell.common.name'),
        flex: 1,
        minWidth: 260,
        type: 'text',
        cellRenderer: renderNameCell,
        valueGetter: (row) => row.name,
      },
      {
        // A dotted path, so sort and filter compare the step count itself.
        field: 'steps.length',
        headerName: t('tech.e2eFlows.colSteps'),
        width: 110,
        type: 'number',
        valueGetter: (row) => String(row.steps.length),
      },
      {
        // Only a Looks good sub flow is ready to become an e2e test.
        field: 'review_status',
        headerName: t('tech.e2eFlows.colReview'),
        width: 170,
        type: 'enum',
        options: reviewOptions(labels),
        cellRenderer: makeRenderReview(labels),
        valueGetter: (row) => labels[row.review_status],
      },
      actionsColumn<E2eSubFlow>({ width: 120, onEdit: onOpen, onDelete, ...namedActions(t) }),
    ];
  }, [t, onOpen, onDelete]);
  const fetchRows = useMemo(
    () => clientTableFetch<E2eSubFlow>(subFlows, searchOf, columns),
    [subFlows, columns]
  );

  // The table fetches once per query change, not per new fetch function — so a
  // saved or deleted sub flow has to ask it to read the new list.
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  return (
    <DuncitTable<E2eSubFlow>
      ariaLabel={t('tech.e2eFlows.colSubFlows')}
      tableId="tech-e2e-sub-flows"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.e2eFlows.subFlowsEmpty')}
      searchPlaceholder={t('tech.e2eFlows.subFlowsSearch')}
      toolbarActions={toolbarActions}
      refetchRef={refetchRef}
      onRowClick={onOpen}
    />
  );
}
