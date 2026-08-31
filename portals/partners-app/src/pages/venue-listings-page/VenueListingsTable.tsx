import { useApolloClient } from '@apollo/client/react';
import { Link as RouterLink } from 'react-router';
import { Avatar, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { MY_VENUES_TABLE, type VenueListingRow } from './queries';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

const rowAction = (status: string) => {
  if (status === 'APPROVED' || status === 'SUBMITTED') return 'View';
  if (status === 'REJECTED') return 'Edit & resubmit';
  return 'Edit';
};

const STATUS_OPTIONS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((value) => ({
  value,
  label: value,
}));

const availabilityDate = (value?: string | null) => formatDate(value) || 'Not available';

const getVenueRowId = (venue: VenueListingRow) => venue.id;

const renderVenue = (venue: VenueListingRow) => (
  <Stack direction="row" spacing={1.25} sx={{
    alignItems: "center"
  }}>
    <Avatar
      variant="rounded"
      src={venue.cover_image_url || '/duncit-logo.svg'}
      alt={venue.venue_name ?? 'Venue'}
      sx={{ width: 32, height: 32, bgcolor: 'action.hover' }}
    />
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" noWrap component="div" sx={{
        fontWeight: 900
      }}>
        {venue.venue_name || 'Untitled venue'}
      </Typography>
      <Typography variant="caption" noWrap component="div" sx={{
        color: "text.secondary"
      }}>
        {venue.venue_type || 'Venue'} · {venue.city || 'City pending'}
      </Typography>
    </Box>
  </Stack>
);

const renderStatus = (venue: VenueListingRow) => (
  <StatusChip status={venue.status} fallbackColor="warning" />
);

const renderActions = (venue: VenueListingRow) => (
  <Stack direction="row" spacing={1} component="span" sx={{
    justifyContent: "flex-end"
  }}>
    {venue.status === 'APPROVED' && (
      <DuncitButton
        size="small"
        component={RouterLink}
        to={`/venues/${venue.id}/availability`}
        startIcon={<EventAvailableIcon />}
      >
        Availability
      </DuncitButton>
    )}
    <DuncitButton size="small" component={RouterLink} to={`/register-venue/${venue.id}`}>
      {rowAction(venue.status)}
    </DuncitButton>
  </Stack>
);

type Translate = ReturnType<typeof useTranslation>['t'];

const columns = (t: Translate): DuncitColumn<VenueListingRow>[] =>[
  {
    field: 'venue_name',
    headerName: t('partners.common.venue'),
    flex: 1,
    minWidth: 230,
    cellRenderer: renderVenue,
    valueGetter: (venue) => venue.venue_name ?? 'Untitled venue',
  },
  {
    field: 'capacity',
    headerName: t('partners.common.capacity'),
    width: 110,
    filter: { type: 'number' },
    valueGetter: (venue) => Number(venue.capacity ?? 0),
  },
  {
    field: 'status',
    headerName: t('shell.common.status'),
    width: 140,
    filter: { type: 'select', options: STATUS_OPTIONS },
    cellRenderer: renderStatus,
    valueGetter: (venue) => venue.status,
  },
  {
    field: 'updated_at',
    headerName: t('shell.common.updated'),
    width: 140,
    valueGetter: (venue) => availabilityDate(venue.updated_at ?? venue.created_at),
  },
  { field: 'venue_type', headerName: t('shell.common.type'), hide: true, filter: { type: 'text' }, minWidth: 130 },
  { field: 'city', headerName: t('partners.common.city'), hide: true, filter: { type: 'text' }, minWidth: 130 },
  { field: 'locality', headerName: t('partners.common.locality'), hide: true, filter: { type: 'text' }, minWidth: 140 },
  {
    field: 'created_at',
    headerName: t('shell.common.created'),
    hide: true,
    filter: { type: 'date' },
    width: 140,
    valueGetter: (venue) => availabilityDate(venue.created_at),
  },
  { field: 'actions', headerName: t('partners.common.action'), sortable: false, width: 230, cellRenderer: renderActions },
];

export default function VenueListingsTable() {
  const { t } = useTranslation();
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<VenueListingRow>(client, MY_VENUES_TABLE, 'myVenuesTable');

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{
            fontWeight: 950
          }}>{t('partners.venueListingsPage.yourVenueRegistrations')}</Typography>
          <DuncitTable<VenueListingRow>
            tableId="partners-app-venues"
            columns={columns(t)}
            fetchRows={fetchRows}
            getRowId={getVenueRowId}
            emptyText={t('partners.venueListingsPage.noVenueRegistrationYet')}
            defaultSort={{ field: 'updated_at', dir: 'desc' }}
            searchPlaceholder="Search venue, type, city"
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
