import { useQuery } from '@apollo/client';
import { Alert, Chip, CircularProgress, List, ListItem, ListItemText, Stack, TextField, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { ClubForm } from '../queries';
import { MATCHING_VENUES } from '../queries';

interface Props {
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
}

const venueLine = (venue: any) => [venue.locality, venue.city, venue.state].filter(Boolean).join(', ');

/** Venues are no longer picked by hand — they auto-match a club by its location
 * + Super/Sub category. This section shows that live matched list (read-only)
 * plus the WhatsApp community links. */
export default function ClubVenueLinksSection({ form, setForm }: Readonly<Props>) {
  const ready = !!form.location_id;
  const { data, loading, error } = useQuery(MATCHING_VENUES, {
    skip: !ready,
    variables: {
      location_id: form.location_id,
      locality: form.locality || null,
      super_category_id: form.super_category_id || null,
      category_id: form.category_id || null,
    },
    fetchPolicy: 'cache-and-network',
  });
  const venues = data?.matchingVenues ?? [];

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <StorefrontIcon fontSize="small" color="action" />
        <Typography variant="subtitle2">Auto-matched venues</Typography>
        {ready && !loading && <Chip size="small" label={venues.length} color={venues.length ? 'primary' : 'default'} />}
      </Stack>

      {!ready && (
        <Alert severity="info">
          Pick a <strong>Location</strong> (and category) in Basic Information — approved venues in that
          city and category will link to this club automatically.
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
          No approved venues match this location and category yet. Venues will appear here as soon as
          they are approved in this city and category.
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

      <TextField label="WhatsApp Community link" value={form.community_link} onChange={(e) => setForm({ ...form, community_link: e.target.value })} fullWidth />
      <TextField label="WhatsApp Announcement link" value={form.announcement_link} onChange={(e) => setForm({ ...form, announcement_link: e.target.value })} fullWidth />
      <TextField label="WhatsApp Group link" value={form.group_link} onChange={(e) => setForm({ ...form, group_link: e.target.value })} fullWidth />
    </Stack>
  );
}
