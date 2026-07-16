import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { PageHeader, StatusChip } from '@duncit/ui';
import {
  AD_MEDIA_TYPE_OPTIONS,
  AD_POSITION_OPTIONS,
  AD_STATUS_COLORS,
  AD_STATUS_OPTIONS,
  adPositionLabel,
  adTypeLabel,
  formatAdCost,
} from './ad-options';
import { MY_ADS_TABLE, type AdRequestRow } from './queries';

const getAdRowId = (row: AdRequestRow) => row.id;

const renderStatus = (row: AdRequestRow) => (
  <StatusChip status={row.status} colorMap={AD_STATUS_COLORS} />
);

const COLUMNS: DuncitColumn<AdRequestRow>[] = [
  {
    field: 'trace_id',
    headerName: 'Trace ID',
    minWidth: 140,
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
    minWidth: 170,
    filter: { type: 'select', options: AD_POSITION_OPTIONS },
    valueGetter: (row) => adPositionLabel(row.position),
  },
  {
    field: 'ad_type',
    headerName: 'Type',
    width: 100,
    sortable: false,
    filter: { type: 'select', options: AD_MEDIA_TYPE_OPTIONS },
    valueGetter: (row) => adTypeLabel(row.ad_type),
  },
  dateColumn<AdRequestRow>({
    field: 'start_at',
    headerName: 'Starts',
    hide: false,
    width: 130,
  }),
  {
    field: 'duration_days',
    headerName: 'Days',
    width: 90,
    valueGetter: (row) => row.duration_days,
  },
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
    filter: { type: 'select', options: AD_STATUS_OPTIONS },
    cellRenderer: renderStatus,
    valueGetter: (row) => row.status,
  },
  dateColumn<AdRequestRow>({
    headerName: 'Submitted',
    hide: false,
    width: 140,
  }),
];

export default function MyAdsPage() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const fetchRows = useApolloTableFetch<AdRequestRow>(client, MY_ADS_TABLE, 'myAdRequestsTable');

  return (
    <Stack spacing={3}>
      <PageHeader
        title="My Ads"
        subtitle="Track your ad requests — quotes, review status and live placements."
      />
      <DuncitTable<AdRequestRow>
        tableId="ads-my-requests"
        columns={COLUMNS}
        fetchRows={fetchRows}
        getRowId={getAdRowId}
        onRowClick={(row) => navigate(`/ads/${row.id}`)}
        toolbarActions={
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/ads/new')}
          >
            New Ad
          </Button>
        }
        emptyText="No ad requests yet — create your first ad"
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder="Search trace ID or title"
      />
    </Stack>
  );
}
