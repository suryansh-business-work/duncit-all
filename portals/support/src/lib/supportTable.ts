import { formatDistanceToNow } from 'date-fns';
import type { TableQueryState } from '@duncit/table';

/** Variables shape shared by the agent list queries (tickets, SOS, callbacks). */
export interface SupportListVars {
  status: string | null;
  search: string | null;
  page: number;
  page_size: number;
  sort_by: string | null;
  sort_dir: 'asc' | 'desc';
}

/**
 * Maps DuncitTable query state onto the existing support list-query args.
 * The only column filter with a server counterpart is the single-select
 * `status` (op `eq`); these tables never offer any other filter.
 */
export function supportListVars(q: TableQueryState): SupportListVars {
  const status = q.filters.find((f) => f.field === 'status' && f.op === 'eq')?.value ?? null;
  return {
    status,
    search: q.search.trim() || null,
    page: q.page,
    page_size: q.pageSize,
    sort_by: q.sortBy,
    sort_dir: q.sortDir,
  };
}

/** "5 minutes ago" style cell value used by the list tables. */
export function relativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}
