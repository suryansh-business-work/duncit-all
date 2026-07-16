import { useQuery } from '@apollo/client';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { BackButton } from '@duncit/ui';
import {
  RegisterVenueForm,
  type RegisterVenueMode,
  type VenueRegistrationConfig,
} from './register-venue-page/register-venue';
import { MY_VENUE, REGISTRATION_CONFIG } from './register-venue-page/queries';

const statusChipColor = (status: string) => {
  if (status === 'APPROVED') return 'success.main';
  return 'rgba(255,255,255,0.2)';
};

function StatusAlerts({ status, notes }: Readonly<{ status?: string; notes?: string }>) {
  if (status === 'SUBMITTED') return <Alert severity="info">Application under review — view only.</Alert>;
  if (status === 'APPROVED') {
    return (
      <Alert severity="success">
        Approved — you can update the description, images, capacity, owner details and add new
        documents. Everything else is locked; locked fields appear greyed out.
      </Alert>
    );
  }
  if (status === 'REJECTED') {
    return <Alert severity="error">Rejected: {notes || 'See notes.'} Update and resubmit.</Alert>;
  }
  return null;
}

export default function RegisterVenuePage() {
  const { venueId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const currentMode = location.pathname.endsWith('/current');

  const { data, loading, refetch } = useQuery(MY_VENUE, {
    variables: { venue_id: venueId ?? null },
    fetchPolicy: 'cache-and-network',
  });
  const configQuery = useQuery(REGISTRATION_CONFIG);
  const config: VenueRegistrationConfig = configQuery.data?.venueRegistrationConfig ?? {
    venue_types: [],
    doc_types: [],
    capacity_item_limit: 50,
    amenities: [],
    facilities: [],
    security: [],
  };

  const account = data?.me;
  const accountEmail = account?.email || '';
  const accountName =
    account?.full_name || [account?.first_name, account?.last_name].filter(Boolean).join(' ');
  const locations = data?.locations ?? [];
  const myVenue = data?.myVenue ?? null;

  // /new only resumes an open draft; /current and /:venueId always hydrate.
  const resumable = myVenue?.status === 'DRAFT' || myVenue?.status === 'REJECTED';
  const hydrate = Boolean(venueId) || currentMode || resumable;
  const venue = hydrate ? myVenue : null;
  const status = venue?.status as string | undefined;
  // SUBMITTED = read-only while under review; APPROVED = spot-edit the allowed
  // subset (description, images, capacity, owner, appended documents, leaves).
  let mode: RegisterVenueMode = 'register';
  if (status === 'SUBMITTED') mode = 'view';
  if (status === 'APPROVED') mode = 'edit-approved';
  const notFound = Boolean(venueId) && !loading && !myVenue;

  if ((loading && !data) || (configQuery.loading && !configQuery.data)) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2,
          color: 'primary.contrastText',
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)`,
        }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1.25}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 0.4, lineHeight: 1, fontWeight: 800 }}>
              Venue registration
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
              {venue ? venue.venue_name || 'Your venue' : 'Register your venue'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 600, mt: 0.5 }}>
              Complete each section, then submit your space for review.
            </Typography>
          </Box>
          {status && (
            <Chip
              size="small"
              label={status}
              sx={{ bgcolor: statusChipColor(status), color: '#fff', fontWeight: 800 }}
            />
          )}
        </Stack>
        <BackButton to="/register-venue" sx={{ mt: 1.5, color: '#fff', fontWeight: 800 }}>
          Your venue registrations
        </BackButton>
      </Box>

      <StatusAlerts status={status} notes={venue?.reviewer_notes} />
      {notFound && <Alert severity="error">This venue registration was not found in your account.</Alert>}

      {!notFound && (
        <RegisterVenueForm
          venue={venue}
          locations={locations}
          account={{ name: accountName, email: accountEmail }}
          config={config}
          mode={mode}
          onPersisted={() => refetch()}
          onSubmitted={(id) => navigate(`/register-venue/${id}`, { replace: true })}
        />
      )}
    </Stack>
  );
}
