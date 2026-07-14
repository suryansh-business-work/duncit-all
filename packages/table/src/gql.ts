import type { TableQueryState } from './types';

/** Maps the client query state to the exact `TableQueryInput` GraphQL variables object. */
export function tableQueryToGql(q: TableQueryState) {
  return {
    query: {
      search: q.search || null,
      page: q.page,
      page_size: q.pageSize,
      sort_by: q.sortBy,
      sort_dir: q.sortDir,
      filters: q.filters.map((f) => ({
        field: f.field,
        op: f.op,
        value: f.value ?? null,
        values: f.values ?? null,
      })),
    },
  };
}
