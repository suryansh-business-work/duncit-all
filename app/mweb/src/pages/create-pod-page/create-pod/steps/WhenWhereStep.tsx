import { Controller } from 'react-hook-form';
import { MenuItem, Stack, TextField } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import VenueMapPreview from '../../../../components/VenueMapPreview';
import type { CreatePodClub, CreatePodForm, CreatePodVenue } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
  venues: CreatePodVenue[];
}

/** Step 2 — venue (physical) or meeting details (virtual), schedule and map. */
export default function WhenWhereStep({ form, clubs, venues }: Readonly<Props>) {
  const {
    control,
    register,
    watch,
    getValues,
    formState: { errors },
  } = form;
  const mode = watch('pod_mode');
  const clubId = watch('club_id');
  const venueId = watch('venue_id');
  const linkedVenueIds = new Set(clubs.find((club) => club.id === clubId)?.meetup_venues_id ?? []);
  const clubVenues = venues.filter((venue) => linkedVenueIds.has(venue.id));
  const selectedVenue = venues.find((venue) => venue.id === venueId);

  return (
    <Stack spacing={2}>
      {mode === 'PHYSICAL' ? (
        <>
          <Controller
            control={control}
            name="venue_id"
            render={({ field }) => (
              <TextField
                select
                label="Venue"
                required
                fullWidth
                value={field.value}
                onChange={field.onChange}
                disabled={!clubId}
                error={!!errors.venue_id}
                helperText={errors.venue_id?.message ?? 'Only your approved venues linked with this club are shown.'}
              >
                {clubVenues.map((venue) => (
                  <MenuItem key={venue.id} value={venue.id}>
                    {venue.venue_name} - {[venue.locality, venue.city].filter(Boolean).join(', ')}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          {selectedVenue && (
            <VenueMapPreview
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
        </>
      ) : (
        <>
          <TextField
            label="Meeting platform"
            fullWidth
            {...register('meeting_platform')}
            error={!!errors.meeting_platform}
            helperText={errors.meeting_platform?.message}
          />
          <TextField
            label="Meeting link"
            required
            fullWidth
            {...register('meeting_url')}
            error={!!errors.meeting_url}
            helperText={errors.meeting_url?.message}
          />
          <TextField label="Meeting notes" fullWidth multiline minRows={2} {...register('meeting_notes')} />
        </>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Controller
          control={control}
          name="pod_date_time"
          render={({ field }) => (
            <DateTimePicker
              label="Start date & time"
              value={field.value}
              onChange={field.onChange}
              minDateTime={new Date()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  error: !!errors.pod_date_time,
                  helperText: errors.pod_date_time?.message,
                },
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="pod_end_date_time"
          render={({ field }) => (
            <DateTimePicker
              label="End date & time"
              value={field.value}
              onChange={field.onChange}
              minDateTime={getValues('pod_date_time') ?? new Date()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.pod_end_date_time,
                  helperText: errors.pod_end_date_time?.message,
                },
              }}
            />
          )}
        />
      </Stack>
    </Stack>
  );
}
