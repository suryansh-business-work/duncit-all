import { gql } from '@apollo/client';
import { Chip } from '@mui/material';
import type { DuncitColumn } from '@duncit/table';
import { formatDateTime } from '@duncit/app-settings';

/**
 * The pods of a venue or a club, as one table.
 *
 * Both lists answer the same question — which pods ran here, when, who hosted
 * them, how full, and whether the venue said yes — so they share the query and
 * the columns rather than keeping a copy each. A host's own pods keep their own
 * set: the host IS the host there, so a Hosts column would only repeat them.
 */
export const RECORD_PODS_TABLE = gql`
  query ConsoleRecordPodsTable($query: TableQueryInput) {
    podsTable(query: $query) {
      total
      rows {
        id
        pod_title
        pod_date_time
        pod_mode
        no_of_spots
        is_active
        venue_approval_status
        host_names
      }
    }
  }
`;

export interface RecordPodRow {
  id: string;
  pod_title: string;
  pod_date_time: string;
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  no_of_spots: number;
  is_active: boolean;
  venue_approval_status: 'NONE' | 'PENDING' | 'APPROVED' | 'DECLINED';
  host_names: string[];
}

type Translate = (key: string) => string;

const EMPTY = '—';

const whenValue = (p: RecordPodRow) => (p.pod_date_time ? formatDateTime(p.pod_date_time) : EMPTY);

const hostsValue = (p: RecordPodRow) => p.host_names.join(', ') || EMPTY;

const renderApproval = (p: RecordPodRow) => <Chip size="small" label={p.venue_approval_status} />;

/** Module scope so no cell is a component defined inside another (S6478), and a
 * factory over `t` because every header is copy (rule 38). */
export const recordPodColumns = (t: Translate): DuncitColumn<RecordPodRow>[] => [
  {
    field: 'pod_title',
    headerName: t('admin.venueDetails.colPod'),
    flex: 1,
    minWidth: 200,
    valueGetter: (p) => p.pod_title,
  },
  {
    field: 'pod_date_time',
    headerName: t('admin.venueDetails.colWhen'),
    minWidth: 170,
    filter: { type: 'date' },
    valueGetter: whenValue,
  },
  {
    field: 'host_names',
    headerName: t('admin.venueDetails.colHosts'),
    minWidth: 160,
    sortable: false,
    valueGetter: hostsValue,
  },
  {
    field: 'no_of_spots',
    headerName: t('admin.venueDetails.colSpots'),
    width: 95,
    valueGetter: (p) => p.no_of_spots,
  },
  {
    field: 'venue_approval_status',
    headerName: t('admin.venueDetails.colApproval'),
    width: 150,
    cellRenderer: renderApproval,
    valueGetter: (p) => p.venue_approval_status,
  },
];
