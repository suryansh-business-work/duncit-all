import { formatDistanceToNow } from 'date-fns';
import type { TableFilterValue, TableQueryState } from '@duncit/table';

/** Variables shape shared by the agent list queries (tickets, SOS, callbacks). */
export interface SupportListVars {
  search: string | null;
  page: number;
  page_size: number;
  sort_by: string | null;
  sort_dir: 'asc' | 'desc';
  /** Every column filter; each list's server allowlist decides what it answers. */
  filters: TableFilterValue[];
  /** Tickets only — set by the list page's Sort dropdown (external filter). */
  priority_first?: string;
}

/**
 * Maps DuncitTable query state onto the support list-query args. Column
 * filters travel as-is in `filters`; `priority_first` arrives as an external
 * filter from the tickets page's Sort dropdown, so it is lifted into its own
 * arg and omitted for the other list queries.
 */
export function supportListVars(q: TableQueryState): SupportListVars {
  const priorityFirst = q.filters.find((f) => f.field === 'priority_first' && f.op === 'eq')?.value;
  return {
    search: q.search.trim() || null,
    page: q.page,
    page_size: q.pageSize,
    sort_by: q.sortBy,
    sort_dir: q.sortDir,
    filters: q.filters.filter((f) => f.field !== 'priority_first'),
    ...(priorityFirst ? { priority_first: priorityFirst } : {}),
  };
}

/** "5 minutes ago" style cell value used by the list tables. */
export function relativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}
