import { useCallback } from 'react';
import { useApolloClient } from '@apollo/client';
import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { format } from 'date-fns';
import { DuncitTable, tableQueryToGql, type DuncitColumn, type TableQueryState } from '@duncit/table';
import { MY_VENUES_TABLE, type VenueListingRow } from './queries';

const rowAction = (status: string) => {
  if (status === 'APPROVED' || status === 'SUBMITTED') return 'View';
  if (status === 'REJECTED') return 'Edit & resubmit';
  return 'Edit';
};

const statusColor = (status: string): 'success' | 'error' | 'info' | 'warning' => {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'error';
  if (status === 'SUBMITTED') return 'info';
  return 'warning';
};

const STATUS_OPTIONS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((value) => ({
  value,
  label: value,
}));

const formatDate = (value?: string | null) =>
  value ? format(new Date(value), 'dd MMM yyyy') : 'Not available';

const getVenueRowId = (venue: VenueListingRow) => venue.id;

const renderVenue = (venue: VenueListingRow) => (
  <Stack direction="row" spacing={1.25} alignItems="center">
    <Avatar
      variant="rounded"
      src={venue.cover_image_url || '/duncit-logo.svg'}
      alt={venue.venue_name ?? 'Venue'}
      sx={{ width: 32, height: 32, bgcolor: 'action.hover' }}
    />
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" fontWeight={900} noWrap component="div">
        {venue.venue_name || 'Untitled venue'}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap component="div">
        {venue.venue_type || 'Venue'} · {venue.city || 'City pending'}
      </Typography>
    </Box>
  </Stack>
);

const renderStatus = (venue: VenueListingRow) => (
  <Chip size="small" label={venue.status} color={statusColor(venue.status)} />
);

const renderActions = (venue: VenueListingRow) => (
  <Stack direction="row" spacing={1} justifyContent="flex-end" component="span">
    {venue.status === 'APPROVED' && (
      <Button
        size="small"
        component={RouterLink}
        to={`/venues/${venue.id}/availability`}
        startIcon={<EventAvailableIcon />}
      >
        Availability
      </Button>
    )}
    <Button size="small" component={RouterLink} to={`/register-venue/${venue.id}`}>
      {rowAction(venue.status)}
    </Button>
  </Stack>
);

const COLUMNS: DuncitColumn<VenueListingRow>[] = [
  {
    field: 'venue_name',
    headerName: 'Venue',
    flex: 1,
    minWidth: 230,
    cellRenderer: renderVenue,
    valueGetter: (venue) => venue.venue_name ?? 'Untitled venue',
  },
  {
    field: 'capacity',
    headerName: 'Capacity',
    width: 110,
    filter: { type: 'number' },
    valueGetter: (venue) => Number(venue.capacity ?? 0),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    filter: { type: 'select', options: STATUS_OPTIONS },
    cellRenderer: renderStatus,
    valueGetter: (venue) => venue.status,
  },
  {
    field: 'updated_at',
    headerName: 'Updated',
    width: 140,
    valueGetter: (venue) => formatDate(venue.updated_at ?? venue.created_at),
  },
  { field: 'venue_type', headerName: 'Type', hide: true, filter: { type: 'text' }, minWidth: 130 },
  { field: 'city', headerName: 'City', hide: true, filter: { type: 'text' }, minWidth: 130 },
  { field: 'locality', headerName: 'Locality', hide: true, filter: { type: 'text' }, minWidth: 140 },
  {
    field: 'created_at',
    headerName: 'Created',
    hide: true,
    filter: { type: 'date' },
    width: 140,
    valueGetter: (venue) => formatDate(venue.created_at),
  },
  { field: 'actions', headerName: 'Action', sortable: false, width: 230, cellRenderer: renderActions },
];

export default function VenueListingsTable() {
  const client = useApolloClient();

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: MY_VENUES_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.myVenuesTable.rows as VenueListingRow[],
        total: data.myVenuesTable.total as number,
      };
    },
    [client],
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6" fontWeight={950}>Your venue registrations</Typography>
          <DuncitTable<VenueListingRow>
            tableId="partners-app-venues"
            columns={COLUMNS}
            fetchRows={fetchRows}
            getRowId={getVenueRowId}
            emptyText="No venue registration yet."
            defaultSort={{ field: 'updated_at', dir: 'desc' }}
            searchPlaceholder="Search venue, type, city"
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
