import { gql } from '@apollo/client';
import { tableQueryToGql, type TableQuerySnapshot } from '@duncit/table';

/** Which telemetry collection a delete acts on — mirrors the server enum. */
export type TelemetryDeleteTarget = 'LOGS' | 'BUGS';

/**
 * What one delete covers, in the exact shape the server input takes.
 *
 * `ids` present means the ticked rows ARE the scope; otherwise the table's own
 * query and the date window narrow it together. Both absent is the whole
 * collection, which is why the server gates that on a stricter role.
 */
export interface TelemetryDeleteScope {
  ids?: string[];
  query?: ReturnType<typeof tableQueryToGql>['query'];
  from?: string | null;
  to?: string | null;
}

export const TELEMETRY_DELETE_COUNT = gql`
  query TelemetryDeleteCount($target: TelemetryDeleteTarget!, $scope: TelemetryDeleteScope!) {
    telemetryDeleteCount(target: $target, scope: $scope)
  }
`;

export const DELETE_TELEMETRY_RECORDS = gql`
  mutation DeleteTelemetryRecords(
    $target: TelemetryDeleteTarget!
    $scope: TelemetryDeleteScope!
  ) {
    deleteTelemetryRecords(target: $target, scope: $scope)
  }
`;

/**
 * The delete scope behind what a table is showing.
 *
 * Paging is stripped rather than passed through: the server ignores it, and a
 * scope that still carried `page: 3` would read as though it meant one page.
 * Sorting goes for the same reason — a delete has no order.
 */
export function scopeFromView(
  snapshot: TableQuerySnapshot,
  window?: { from?: string | null; to?: string | null },
): TelemetryDeleteScope {
  const { query } = tableQueryToGql(snapshot.query);
  return {
    query: { ...query, page: 1, page_size: 1, sort_by: null },
    from: window?.from ?? null,
    to: window?.to ?? null,
  };
}

/**
 * Whether a scope narrows anything at all. The client mirror of the server's
 * own predicate, used ONLY to warn and to hide a button an account cannot use —
 * the role gate itself is the server's, and stays the server's.
 */
export function scopeIsEverything(scope: TelemetryDeleteScope): boolean {
  if (scope.ids) return false;
  if (scope.from || scope.to) return false;
  const query = scope.query;
  if (!query) return true;
  return !query.search && (query.filters?.length ?? 0) === 0;
}
