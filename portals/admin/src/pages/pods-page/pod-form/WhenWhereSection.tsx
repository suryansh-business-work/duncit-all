import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { MenuItem, Stack, TextField } from '@mui/material';
import DateTimeField from '../../../components/DateTimeField';
import GoogleMapPreview from '../../../components/GoogleMapPreview';
import type { PodForm } from '../queries';

interface Props {
  clubs: any[];
  venues: any[];
}

export default function WhenWhereSection({ clubs, venues }: Readonly<Props>) {
  const { control, setValue, formState: { errors } } = useFormContext<PodForm>();
  const clubId = useWatch({ control, name: 'club_id' });
  const venueId = useWatch({ control, name: 'venue_id' });
  const startDateTime = useWatch({ control, name: 'pod_date_time' });
  const linkedVenueIds = new Set(
    (clubs.find((club) => club.id === clubId)?.matched_venues ?? []).map((v: any) => v.id)
  );
  const clubVenues = venues.filter((venue) => linkedVenueIds.has(venue.id));
  const selectedVenue = venues.find((venue) => venue.id === venueId);
  const now = new Date();
  const endMin = startDateTime && new Date(startDateTime) > now
    ? new Date(startDateTime)
    : now;
  const venueHint = clubVenues.length === 0
    ? 'No approved venues linked to this club.'
    : 'Only venues linked with this club are shown.';

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Venue"
          value={venueId}
          onChange={(event) => {
            setValue('venue_id', event.target.value, { shouldValidate: true });
            setValue('location_id', '');
            setValue('zone_name', '');
          }}
          fullWidth
          required
          disabled={!clubId}
          error={!!errors.venue_id}
          helperText={
            errors.venue_id?.message ||
            (!clubId ? 'Pick a club in Basic Information first.' : venueHint)
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
        <Controller
          control={control}
          name="pod_date_time"
          render={({ field, fieldState }) => (
            <DateTimeField
              label="Start date & time"
              value={field.value}
              onChange={field.onChange}
              minDateTime={now}
              required
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="pod_end_date_time"
          render={({ field, fieldState }) => (
            <DateTimeField
              label="End date & time"
              value={field.value}
              onChange={field.onChange}
              minDateTime={endMin}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
      </Stack>
    </Stack>
  );
}
