import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, Divider, ListItemButton, Skeleton, Stack, Typography } from '@mui/material';
import StoreRoundedIcon from '@mui/icons-material/StoreRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { DuncitButton } from '@duncit/buttons';
import { venueLabel, type SwitchableVenue } from '@duncit/utils';
import StudioPageHeader from '../../components/StudioPageHeader';
import { SURFACE_SX } from '../../theme';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';
import { useTranslation } from '../../i18n/useTranslation';
import { MY_VENUES_SWITCHER } from '../venue-manage-page/queries';
import { openPartnerPortal } from '../studio-options/openPartnerPortal';

/** A venue's application status, as a chip colour. */
function statusColor(status: string | null | undefined): 'success' | 'error' | 'warning' {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'error';
  return 'warning';
}

/**
 * Venue Options → Your Venues: every venue the owner runs — name, city and
 * status. Tapping one makes it THE venue (remembered for every venue page)
 * and opens its dashboard; Add and Edit open the registration wizard in the
 * Partner app, the same one the Partner console's venue list opens.
 */
export default function VenueListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(MY_VENUES_SWITCHER, { fetchPolicy: 'cache-and-network' });
  const venues: SwitchableVenue[] = data?.myVenues ?? [];
  const { venueId, selectVenue } = useSelectedVenue(venues);
  const untitled = t('mweb.venueManagePage.untitledVenue');

  let body;
  if (loading && !data) {
    body = <Skeleton variant="rounded" height={160} data-testid="venue-list-loading" />;
  } else if (error && !data) {
    body = <Alert severity="error" data-testid="venue-list-error">{error.message}</Alert>;
  } else if (venues.length === 0) {
    body = <Alert severity="info" data-testid="venue-list-empty">{t('mweb.studioOptions.noVenuesYet')}</Alert>;
  } else {
    body = (
      <Box component="ul" data-testid="venue-list" sx={{ ...SURFACE_SX, overflow: 'hidden', listStyle: 'none', m: 0, p: 0 }}>
        {venues.map((venue, index) => (
          <Box component="li" key={venue.id}>
            {index > 0 && <Divider sx={{ mx: 2 }} />}
            <Stack direction="row" sx={{ alignItems: 'center', pr: 1 }}>
              <ListItemButton
                data-testid={`venue-list-row-${venue.id}`}
                selected={venue.id === venueId}
                onClick={() => {
                  selectVenue(venue.id);
                  navigate('/venues/manage');
                }}
                sx={{ py: 1.5, gap: 1.5, minWidth: 0 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 600 }}>{venueLabel(venue, untitled)}</Typography>
                  {venue.city && (
                    <Typography noWrap variant="caption" sx={{ color: 'text.secondary' }}>{venue.city}</Typography>
                  )}
                </Box>
                {venue.status && <Chip size="small" label={venue.status} color={statusColor(venue.status)} />}
              </ListItemButton>
              <DuncitButton
                size="small"
                variant="text"
                startIcon={<EditRoundedIcon />}
                onClick={() => openPartnerPortal(`/register-venue/${venue.id}`)}
                aria-label={`${t('mweb.studioOptions.editVenue')} ${venueLabel(venue, untitled)}`}
                data-testid={`venue-list-edit-${venue.id}`}
              >
                {t('mweb.studioOptions.editVenue')}
              </DuncitButton>
            </Stack>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ p: 2, maxWidth: 760, mx: 'auto', width: '100%' }} data-testid="venue-list-page">
      <StudioPageHeader
        icon={<StoreRoundedIcon fontSize="small" />}
        title={t('mweb.studioOptions.yourVenues')}
        action={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => openPartnerPortal('/register-venue/new')}
            data-testid="venue-list-add"
          >
            {t('mweb.studioOptions.addVenue')}
          </DuncitButton>
        }
      />
      {body}
    </Stack>
  );
}
