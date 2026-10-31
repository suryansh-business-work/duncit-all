import type { TableFilterValue } from '@duncit/table';
import { isLeadPipeline, isLeadStage } from './copy';

/**
 * The pins a URL asks for: `?stage=QUALIFIED`, `?pipeline=VENUE`. A value
 * that names nothing is ignored rather than sent — the summary cards and
 * the dashboard land here with them.
 */
export function pinnedLeadFilters(params: URLSearchParams): TableFilterValue[] {
  const filters: TableFilterValue[] = [];
  const stage = params.get('stage');
  if (isLeadStage(stage)) filters.push({ field: 'stage', op: 'eq', value: stage });
  const pipeline = params.get('pipeline');
  if (isLeadPipeline(pipeline)) filters.push({ field: 'pipeline', op: 'eq', value: pipeline });
  return filters;
}
