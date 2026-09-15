import { useQuery } from '@apollo/client/react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { BackButton } from '@duncit/ui';
import {
  RegisterVenueForm,
  type RegisterVenueMode,
  type VenueRegistrationConfig,
} from './register-venue-page/register-venue';
import { MY_VENUE, REGISTRATION_CONFIG } from './register-venue-page/queries';
import { useTranslation } from '@duncit/shell';
import { primaryHeroBackground } from '../components/primaryHero';
import { tokens } from '../theme';

/** Fills that keep the chip's white label at 4.5:1 on the accent banner in both
 * modes: the light-mode success green (the dark-mode one is a pale text
 * colour), and a black scrim rather than a white one. */
const statusChipColor = (status: string) => {
  if (status === 'APPROVED') return tokens.semantic.success;
  return 'rgba(0,0,0,0.28)';
};

function StatusAlerts({ status, notes }: Readonly<{ status?: string; notes?: string }>) {
  const { t } = useTranslation();
  if (status === 'SUBMITTED') return <Alert severity="info">{t('partners.page.applicationUnderReviewViewOnly')}</Alert>;
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
  const { t } = useTranslation();
  const { venueId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const currentMode = location.pathname.endsWith('/current');

  const { data, loading, refetch } = useQuery<any>(MY_VENUE, {
    variables: { venue_id: venueId ?? null },
    fetchPolicy: 'cache-and-network',
  });
  const configQuery = useQuery<any>(REGISTRATION_CONFIG);
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
      <Stack
        sx={{
          alignItems: "center",
          py: 6
        }}>
        <CircularProgress size={28} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2,
          color: 'common.white',
          background: primaryHeroBackground,
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{
          alignItems: "flex-start"
        }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ letterSpacing: 0.4, lineHeight: 1, fontWeight: 800 }}>
              {t('partners.venueListingsPage.venueRegistration')}
            </Typography>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
              {venue ? venue.venue_name || 'Your venue' : t('partners.common.registerYourVenue')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
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
          {t('partners.venueListingsPage.yourVenueRegistrations')}
        </BackButton>
      </Box>

      <StatusAlerts status={status} notes={venue?.reviewer_notes} />
      {notFound && <Alert severity="error">{t('partners.page.thisVenueRegistrationWasNotFound')}</Alert>}

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
