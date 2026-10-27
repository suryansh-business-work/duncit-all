import { useCallback, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import type { ManualTestBoardFilter } from '@duncit/gql-types';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import {
  MANUAL_TEST_BOARD,
  MANUAL_TEST_COLUMN_CASES,
  type BoardData,
  type BoardVariables,
  type ColumnCasesData,
  type ColumnCasesVariables,
} from '../shared/board.queries';
import { manualErrorText } from '../shared/errors';
import type { BoardColumnData } from '../shared/types';
import { appendCases } from './boardCache';

const NO_COLUMNS: BoardColumnData[] = [];
const WHERE = { page: '/manual/board', component: 'useBoardData' };

/** The board for a filter, and "load more" for a column that has more cards than it shows. */
export function useBoardData(filter: ManualTestBoardFilter) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const variables = useMemo<BoardVariables>(() => ({ filter }), [filter]);
  const { data, loading, error, refetch } = useQuery<BoardData, BoardVariables>(MANUAL_TEST_BOARD, {
    variables,
    fetchPolicy: 'cache-and-network',
  });
  const [loadingMore, setLoadingMore] = useState<string | null>(null);
  const columns = data?.manualTestBoard.columns ?? NO_COLUMNS;

  const loadMore = useCallback(
    async (columnId: string) => {
      const current = columns.find((column) => column.column.id === columnId);
      if (!current) return;
      setLoadingMore(columnId);
      try {
        const result = await client.query<ColumnCasesData, ColumnCasesVariables>({
          query: MANUAL_TEST_COLUMN_CASES,
          variables: { column_id: columnId, filter, offset: current.cases.length },
          fetchPolicy: 'network-only',
        });
        const page = result.data?.manualTestColumnCases;
        if (page) {
          client.cache.updateQuery<BoardData, BoardVariables>({ query: MANUAL_TEST_BOARD, variables }, (previous) =>
            previous ? appendCases(previous, columnId, page) : previous
          );
        }
      } catch (err) {
        notifyError(manualErrorText(t, err, t('testsManual.board.loadMoreFailed'), WHERE));
      } finally {
        setLoadingMore(null);
      }
    },
    [client, columns, filter, t, variables]
  );

  const reload = useCallback(() => {
    refetch().catch((err: unknown) => notifyError(manualErrorText(t, err, t('testsManual.board.loadFailed'), WHERE)));
  }, [refetch, t]);

  return { columns, hasData: Boolean(data), loading, error, variables, loadMore, loadingMore, reload };
}
