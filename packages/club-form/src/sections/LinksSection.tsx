import { useQuery } from '@apollo/client';
import { Alert, Chip, CircularProgress, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useFormContext, useWatch } from 'react-hook-form';
import RhfTextField from '../components/RhfTextField';
import { useClubFormData } from '../context';
import { MATCHING_VENUES } from '../queries';
import type { ClubFormValues } from '../types';

const venueLine = (venue: any) => [venue.locality, venue.city, venue.state].filter(Boolean).join(', ');

/** Read-only list of venues that auto-match this club by location + category.
 * Admin-only: the `matchingVenues` query requires an admin role. Hoisted to
 * module scope (S6478). */
function MatchedVenuesPanel() {
  const { control } = useFormContext<ClubFormValues>();
  const locationId = useWatch({ control, name: 'location_id' });
  const locality = useWatch({ control, name: 'locality' });
  const superId = useWatch({ control, name: 'super_category_id' });
  const categoryId = useWatch({ control, name: 'category_id' });
  const ready = !!locationId;

  const { data, loading, error } = useQuery(MATCHING_VENUES, {
    skip: !ready,
    variables: {
      location_id: locationId,
      locality: locality || null,
      super_category_id: superId || null,
      category_id: categoryId || null,
    },
    fetchPolicy: 'cache-and-network',
  });
  const venues = data?.matchingVenues ?? [];

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <StorefrontIcon fontSize="small" color="action" />
        <Typography variant="subtitle2">Auto-matched venues</Typography>
        {ready && !loading && <Chip size="small" label={venues.length} color={venues.length ? 'primary' : 'default'} />}
      </Stack>
      {!ready && (
        <Alert severity="info">
          Pick a <strong>Location</strong> (and category) in Basic Information — approved venues in that city and category
          will link to this club automatically.
        </Alert>
      )}
      {ready && loading && (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">Finding matching venues…</Typography>
        </Stack>
      )}
      {ready && error && <Alert severity="error">{error.message}</Alert>}
      {ready && !loading && !error && venues.length === 0 && (
        <Alert severity="warning">
          No approved venues match this location and category yet. Venues appear here as soon as they are approved in this
          city and category.
        </Alert>
      )}
      {ready && venues.length > 0 && (
        <List dense disablePadding>
          {venues.map((venue: any) => (
            <ListItem key={venue.id} disableGutters>
              <ListItemText primary={venue.venue_name} secondary={venueLine(venue)} />
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}

/** WhatsApp community + group links, plus the admin-only auto-matched venues. */
export default function LinksSection() {
  const { config } = useClubFormData();
  const { control } = useFormContext<ClubFormValues>();

  return (
    <Stack spacing={2}>
      {config.showAdmins && <MatchedVenuesPanel />}
      <RhfTextField
        control={control}
        name="community_link"
        label="WhatsApp Community link"
        required
        hint="Invite link members join — shown on the club page (mWeb + app)."
      />
      <RhfTextField
        control={control}
        name="group_link"
        label="WhatsApp Group link"
        required
        hint="Group chat link — shown on the club page (mWeb + app)."
      />
    </Stack>
  );
}
