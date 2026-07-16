import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { AD_STATUS_COLORS, adPositionLabel, formatAdCost } from '../ads/ad-options';
import { MY_ADS_TABLE, type AdRequestRow } from '../ads/queries';

const getAdRowId = (row: AdRequestRow) => row.id;

const renderStatus = (row: AdRequestRow) => (
  <StatusChip status={row.status} colorMap={AD_STATUS_COLORS} />
);

// A trimmed My Ads column set with no filters, so the toolbar stays lean.
const COLUMNS: DuncitColumn<AdRequestRow>[] = [
  {
    field: 'trace_id',
    headerName: 'Trace ID',
    minWidth: 130,
    valueGetter: (row) => row.trace_id,
  },
  {
    field: 'ad_title',
    headerName: 'Title',
    flex: 1,
    minWidth: 180,
    valueGetter: (row) => row.ad_title,
  },
  {
    field: 'position',
    headerName: 'Position',
    minWidth: 150,
    valueGetter: (row) => adPositionLabel(row.position),
  },
  dateColumn<AdRequestRow>({
    field: 'start_at',
    headerName: 'Starts',
    hide: false,
    width: 130,
    filterable: false,
  }),
  {
    field: 'estimated_cost',
    headerName: 'Est. Cost',
    width: 120,
    valueGetter: (row) => formatAdCost(row.estimated_cost, row.currency_symbol),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    cellRenderer: renderStatus,
    valueGetter: (row) => row.status,
  },
];

/** Compact preview of the advertiser's latest requests, reusing myAdRequestsTable. */
export default function RecentAdsTable() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const fetchRows = useApolloTableFetch<AdRequestRow>(client, MY_ADS_TABLE, 'myAdRequestsTable');

  return (
    <DuncitTable<AdRequestRow>
      tableId="ads-dashboard-recent"
      columns={COLUMNS}
      fetchRows={fetchRows}
      getRowId={getAdRowId}
      onRowClick={(row) => navigate(`/ads/${row.id}`)}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={10}
      emptyText="No ad requests yet — create your first ad"
      searchPlaceholder="Search recent requests"
    />
  );
}
