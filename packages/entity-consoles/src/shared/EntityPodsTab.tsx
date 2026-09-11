import type { DocumentNode } from 'graphql';
import type { DuncitColumn } from '@duncit/table';
import EntityRecordsTab from './EntityRecordsTab';

/**
 * The pods belonging to one directory record, off the shared pods table engine.
 *
 * `venue_id`, `host_user_id` and `club_id` are all allowlisted `podsTable`
 * filters, so a venue's pods, a host's pods and a club's pods are the same query
 * with a different filter — which is why each console supplies only its own
 * columns and copy (rule 34).
 */
export interface EntityPodsTabProps<Row extends { id: string }> {
  /** The allowlisted `podsTable` filter field, e.g. `venue_id`. */
  filterField: string;
  filterValue: string;
  /** The console's own `podsTable` document. */
  document: DocumentNode;
  columns: DuncitColumn<Row>[];
  tableId: string;
  title: string;
  subtitle: string;
  emptyText: string;
}

const podPath = (pod: { id: string }) => `/pods/${pod.id}`;

export default function EntityPodsTab<Row extends { id: string }>({
  filterField,
  filterValue,
  ...table
}: Readonly<EntityPodsTabProps<Row>>) {
  return (
    <EntityRecordsTab<Row>
      {...table}
      resultKey="podsTable"
      filter={{ field: filterField, op: 'eq', value: filterValue }}
      defaultSortField="pod_date_time"
      rowPath={podPath}
    />
  );
}
