import type { TableFilterValue } from '@duncit/table';
import { OPEN_STATUSES, isRunStatus, isRunWorkflow } from './copy';

/**
 * The pins a URL asks for: `?status=FAILED`, `?workflow=REEL`, `?mine=1`.
 * A value that names nothing is ignored rather than sent. Null while a pin on
 * the signed-in person cannot be built yet — the page waits rather than
 * showing everyone's runs under "mine".
 */
export function pinnedFilters(params: URLSearchParams, userId: string | null): TableFilterValue[] | null {
  const filters: TableFilterValue[] = [];
  const status = params.get('status');
  if (isRunStatus(status)) filters.push({ field: 'status', op: 'eq', value: status });
  const workflow = params.get('workflow');
  if (isRunWorkflow(workflow)) filters.push({ field: 'workflow', op: 'eq', value: workflow });
  if (params.get('mine') === '1') {
    if (!userId) return null;
    filters.push({ field: 'actor_id', op: 'eq', value: userId });
  }
  return filters;
}

/** The signed-in person's runs that have not finished — what My Tasks lists. */
export const openRunFilters = (userId: string): TableFilterValue[] => [
  { field: 'actor_id', op: 'eq', value: userId },
  { field: 'status', op: 'in', values: [...OPEN_STATUSES] },
];

/** What Approvals lists: only runs waiting on a person. */
export const AWAITING_APPROVAL_FILTERS: readonly TableFilterValue[] = [
  { field: 'status', op: 'eq', value: 'AWAITING_APPROVAL' },
];
