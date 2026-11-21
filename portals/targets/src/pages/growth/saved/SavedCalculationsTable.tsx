import { useMemo, type MutableRefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { GROWTH_CALCULATIONS_TABLE, type SavedCalculation } from '../../../lib/queries';
import { getSavedColumns, type SavedRowActions } from './saved-columns';

const getRowId = (row: SavedCalculation) => row.id;

interface Props extends SavedRowActions {
  refetchRef: MutableRefObject<(() => void) | null>;
}

/**
 * Every saved calculation, newest first, with search, sorting, filters and
 * paging all answered by the server — so the list is the same after a
 * refresh, a sign-out or another browser. Clicking a row opens its details.
 */
export default function SavedCalculationsTable({ refetchRef, ...actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<SavedCalculation>(client, GROWTH_CALCULATIONS_TABLE, 'growthCalculationsTable');
  const { onView, onEdit, onDuplicate, onDelete } = actions;
  const columns = useMemo(
    () => getSavedColumns({ t, formatDateTime, onView, onEdit, onDuplicate, onDelete }),
    [t, formatDateTime, onView, onEdit, onDuplicate, onDelete]
  );

  return (
    <DuncitTable<SavedCalculation>
      tableId="targets-growth-calculations"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onView}
      emptyText={t('targets.growth.saved.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('targets.growth.saved.search')}
      refetchRef={refetchRef}
    />
  );
}
