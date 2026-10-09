import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { brandOrdersPageCount, brandOrdersTableQuery } from '@duncit/utils';

import { TableFilterOp, TableSortDir, type TableQueryInput } from '@/generated/graphql/graphql';
import { BrandOrdersTableDocument } from '@/graphql/brand-orders';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';

export type BrandOrderRow = ResultOf<
  typeof BrandOrdersTableDocument
>['brandProductOrdersTable']['rows'][number];

/**
 * The partner's brand orders, one page at a time, newest first — searchable
 * by order no., buyer or AWB and filterable by status. A new search or status
 * goes back to the first page. RN twin of mWeb's BrandOrdersPage.
 */
export function useBrandOrders() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BrandOrderRow[]>([]);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebouncedValue(search.trim());
  // The page a settled search asked for; typing again starts over at page one.
  const [searched, setSearched] = useState(debounced);
  if (searched !== debounced) {
    setSearched(debounced);
    setPage(1);
  }

  const load = useCallback(async () => {
    const view = brandOrdersTableQuery({ page, status, search: debounced });
    // This app's codegen types the enums as TS enums — the same values, named.
    const query: TableQueryInput = {
      ...view,
      sort_dir: TableSortDir.Desc,
      filters: view.filters.map((filter) => ({ ...filter, op: TableFilterOp.Eq })),
    };
    const data = await graphqlRequest(BrandOrdersTableDocument, { query }, { auth: true });
    const table = data.brandProductOrdersTable;
    setRows(table.rows);
    setPages(brandOrdersPageCount(table.total, table.page_size));
    setError(null);
  }, [page, status, debounced]);
  const { isLoading, refetch } = useReloadableQuery(load, {
    onError: (err) => setError(toErrorMessage(err, t('mweb.brandOrders.loadFailed'))),
  });

  return {
    rows,
    page,
    pages,
    status,
    search,
    filtered: !!status || !!debounced,
    isLoading,
    error,
    setSearch,
    setPage,
    setStatus: (next: string) => {
      setStatus(next);
      setPage(1);
    },
    retry: () => {
      // A failed reload lands in `error` through onError; this only hands the promise off.
      fireAndForget(refetch());
    },
  };
}
