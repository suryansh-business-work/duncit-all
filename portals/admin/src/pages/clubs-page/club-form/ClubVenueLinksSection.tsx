import { Autocomplete, Stack, TextField } from '@mui/material';
import type { ClubForm } from '../queries';

interface Props {
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
  venues: any[];
}

const venueLabel = (venue: any) =>
  [venue.venue_name, venue.locality, venue.city].filter(Boolean).join(' - ');

export default function ClubVenueLinksSection({ form, setForm, venues }: Readonly<Props>) {
  const selected = venues.filter((venue) => form.meetup_venues_id.includes(venue.id));

  return (
    <Stack spacing={2}>
      <Autocomplete
        multiple
        options={venues}
        value={selected}
        getOptionLabel={venueLabel}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        onChange={(_, value) => setForm({ ...form, meetup_venues_id: value.map((venue: any) => venue.id) })}
        renderInput={(params) => (
          <TextField {...params} label="We usually meet at" helperText="Select one or more approved registered venues." />
        )}
      />
      <TextField label="WhatsApp Community link" value={form.community_link} onChange={(e) => setForm({ ...form, community_link: e.target.value })} fullWidth />
      <TextField label="WhatsApp Announcement link" value={form.announcement_link} onChange={(e) => setForm({ ...form, announcement_link: e.target.value })} fullWidth />
      <TextField label="WhatsApp Group link" value={form.group_link} onChange={(e) => setForm({ ...form, group_link: e.target.value })} fullWidth />
    </Stack>
  );
}