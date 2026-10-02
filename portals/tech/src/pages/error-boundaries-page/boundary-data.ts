import { BOUNDARY_LOG_COMPONENT } from '@duncit/utils';
import type { TableFilterValue } from '@duncit/table';
import type { ErrorLogRow } from '../error-logs-page/queries';

/**
 * The Error Boundaries page reads the same telemetry rows as Error Logs,
 * pinned to the boundary marker instead: every boundary — the shared
 * DuncitErrorBoundary on mWeb and the portals, and native's twin — logs with
 * component = 'errorBoundary'. The marker comes from the package itself, so
 * the two ends can never drift.
 */
export const BOUNDARY_FILTER: readonly TableFilterValue[] = [
  { field: 'component', op: 'eq', value: BOUNDARY_LOG_COMPONENT },
];

/** What @duncit/utils `crashLogData` ships inside the log's data blob. */
export interface BoundaryData {
  event?: string;
  crash_id?: string;
  scope?: string;
  surface?: string;
  component_stack?: string;
}

export function parseBoundaryData(row: ErrorLogRow): BoundaryData {
  if (!row.data_json) return {};
  try {
    return JSON.parse(row.data_json) as BoundaryData;
  } catch {
    return {};
  }
}

/** Which surface crashed: the portal key for a console, otherwise the app (mWeb, mobileApp). */
export const surfaceOf = (row: ErrorLogRow) => row.portal ?? row.app;
