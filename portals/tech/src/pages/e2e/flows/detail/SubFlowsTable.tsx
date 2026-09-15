import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, actionsColumn, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { getRowId, namedActions, renderNameCell } from '../cells';
import type { E2eSubFlow } from '../queries';
import { makeRenderReview, reviewLabels, type ReviewLabels } from '../review';

interface Props {
  subFlows: E2eSubFlow[];
  toolbarActions: ReactNode;
  onOpen: (row: E2eSubFlow) => void;
  onDelete: (row: E2eSubFlow) => void;
}

/**
 * A sub flow matches on its name, its description, its review verdict and any
 * of its steps — so searching "Looks good" lists the ones ready for e2e.
 */
const searchOf = (row: E2eSubFlow, labels: ReviewLabels) =>
  [
    row.name,
    row.description,
    labels[row.review_status],
    ...row.steps.flatMap((step) => [step.action, step.expected]),
  ].join(' ');

/** The flow's sub flows, in the order they were added. A row opens its steps. */
export default function SubFlowsTable({
  subFlows,
  toolbarActions,
  onOpen,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const refetchRef = useRef<(() => void) | null>(null);
  const labels = useMemo(() => reviewLabels(t), [t]);
  const fetchRows = useMemo(
    () => clientTableFetch<E2eSubFlow>(subFlows, (row) => searchOf(row, labels)),
    [subFlows, labels]
  );

  // The table fetches once per query change, not per new fetch function — so a
  // saved or deleted sub flow has to ask it to read the new list.
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  const columns = useMemo<DuncitColumn<E2eSubFlow>[]>(
    () => [
      {
        field: 'name',
        headerName: t('shell.common.name'),
        flex: 1,
        minWidth: 260,
        cellRenderer: renderNameCell,
        valueGetter: (row) => row.name,
      },
      {
        field: 'steps',
        headerName: t('tech.e2eFlows.colSteps'),
        width: 110,
        sortable: false,
        valueGetter: (row) => String(row.steps.length),
      },
      {
        // Only a Looks good sub flow is ready to become an e2e test.
        field: 'review_status',
        headerName: t('tech.e2eFlows.colReview'),
        width: 170,
        sortable: false,
        cellRenderer: makeRenderReview(labels),
        valueGetter: (row) => labels[row.review_status],
      },
      actionsColumn<E2eSubFlow>({ width: 120, onEdit: onOpen, onDelete, ...namedActions(t) }),
    ],
    [t, labels, onOpen, onDelete]
  );

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
