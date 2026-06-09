import { useFormikContext } from 'formik';
import { MenuItem, Stack, TextField } from '@mui/material';
import DateTimeField from '../../../components/DateTimeField';
import GoogleMapPreview from '../../../components/GoogleMapPreview';
import type { PodForm } from '../queries';

interface Props {
  clubs: any[];
  venues: any[];
}

export default function WhenWhereSection({ clubs, venues }: Readonly<Props>) {
  const { values, errors, touched, setFieldValue } = useFormikContext<PodForm>();
  const err = (k: keyof PodForm) => !!touched[k] && !!errors[k];
  const help = (k: keyof PodForm) => (touched[k] ? (errors[k] as string) : undefined);
  const linkedVenueIds = new Set(
    clubs.find((club) => club.id === values.club_id)?.meetup_venues_id ?? []
  );
  const clubVenues = venues.filter((venue) => linkedVenueIds.has(venue.id));
  const selectedVenue = venues.find((venue) => venue.id === values.venue_id);
  const now = new Date();
  const endMin = values.pod_date_time && new Date(values.pod_date_time) > now
    ? new Date(values.pod_date_time)
    : now;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Venue"
          name="venue_id"
          value={values.venue_id}
          onChange={(event) => {
            setFieldValue('venue_id', event.target.value);
            setFieldValue('location_id', '');
            setFieldValue('zone_name', '');
          }}
          fullWidth
          required
          disabled={!values.club_id}
          error={err('venue_id')}
          helperText={
            help('venue_id') ||
            (!values.club_id
              ? 'Pick a club in Basic Information first.'
              : clubVenues.length === 0
                ? 'No approved venues linked to this club.'
                : 'Only venues linked with this club are shown.')
          }
        >
          {clubVenues.map((venue) => (
            <MenuItem key={venue.id} value={venue.id}>
              {venue.venue_name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {selectedVenue && (
        <GoogleMapPreview
          title={selectedVenue.venue_name}
          parts={[
            selectedVenue.venue_name,
            selectedVenue.address_line1,
            selectedVenue.locality,
            selectedVenue.city,
            selectedVenue.state,
            selectedVenue.postal_code,
            selectedVenue.country,
          ]}
          lat={selectedVenue.lat}
          lng={selectedVenue.lng}
        />
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DateTimeField
          label="Start date & time"
          value={values.pod_date_time}
          onChange={(iso) => setFieldValue('pod_date_time', iso)}
          minDateTime={now}
          required
          error={err('pod_date_time')}
          helperText={help('pod_date_time')}
        />
        <DateTimeField
          label="End date & time"
          value={values.pod_end_date_time}
          onChange={(iso) => setFieldValue('pod_end_date_time', iso)}
          minDateTime={endMin}
          error={err('pod_end_date_time')}
          helperText={help('pod_end_date_time')}
        />
      </Stack>
    </Stack>
  );
}
