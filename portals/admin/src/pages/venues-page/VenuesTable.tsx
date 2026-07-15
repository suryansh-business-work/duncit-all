import { useMemo, type MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { STATUS_OPTIONS, type VenueRow } from './queries';

const getVenueRowId = (v: VenueRow) => v.id;

const renderVenue = (v: VenueRow) => (
  <>
    <Typography variant="body2" fontWeight={700}>
      {v.venue_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" display="block">
      {v.venue_type || '—'}
    </Typography>
  </>
);

const locationValue = (v: VenueRow) => [v.locality, v.city].filter(Boolean).join(', ') || '—';

const categoryValue = (v: VenueRow) =>
  [
    v.venue_category?.super_category_name,
    v.venue_category?.category_name,
    v.venue_category?.sub_category_name,
  ]
    .filter(Boolean)
    .join(' > ') || '—';

const renderOwner = (v: VenueRow) => (
  <>
    <Typography variant="body2">{v.owner_name || '—'}</Typography>
    <Typography variant="caption" color="text.secondary" display="block">
      {v.owner_phone || v.owner_email || '—'}
    </Typography>
  </>
);

const renderStatus = (v: VenueRow) => <Chip size="small" label={v.status} />;

const activeValue = (v: VenueRow) => (v.is_active === false ? 'Inactive' : 'Active');

const renderActive = (v: VenueRow) => (
  <Chip
    size="small"
    variant="outlined"
    color={v.is_active === false ? 'default' : 'success'}
    label={activeValue(v)}
  />
);

const createdValue = (v: VenueRow) =>
  v.created_at ? new Date(v.created_at).toLocaleDateString() : '—';

/** Read-only admin venues list — approvals/edits stay in the Onboarding portal. */
export default function VenuesTable({
  fetchRows,
  refetchRef,
}: Readonly<{
  fetchRows: TableFetch<VenueRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
}>) {
  const columns = useMemo<DuncitColumn<VenueRow>[]>(
    () => [
      { field: 'venue_name', headerName: 'Venue', flex: 1, minWidth: 180, cellRenderer: renderVenue, valueGetter: (v) => v.venue_name },
      { field: 'venue_category', headerName: 'Category', minWidth: 200, sortable: false, valueGetter: categoryValue },
      { field: 'locality', headerName: 'Location', minWidth: 160, filter: { type: 'text' }, valueGetter: locationValue },
      { field: 'owner_name', headerName: 'Owner', minWidth: 150, cellRenderer: renderOwner, valueGetter: (v) => v.owner_name || '—' },
      { field: 'capacity', headerName: 'Capacity', width: 105, filter: { type: 'number' } },
      { field: 'status', headerName: 'Status', width: 125, filter: { type: 'select', options: STATUS_OPTIONS }, cellRenderer: renderStatus, valueGetter: (v) => v.status },
      { field: 'is_active', headerName: 'Active', width: 110, filter: { type: 'boolean' }, cellRenderer: renderActive, valueGetter: activeValue },
      { field: 'pod_count', headerName: 'Pods', sortable: false, width: 90, valueGetter: (v) => v.pod_count ?? 0 },
      { field: 'created_at', headerName: 'Created', width: 125, filter: { type: 'date' }, valueGetter: createdValue },
    ],
    [],
  );

  return (
    <DuncitTable<VenueRow>
      tableId="admin-venues"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getVenueRowId}
      emptyText="No venues found."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search name, type, city or owner"
      refetchRef={refetchRef}
    />
  );
}
