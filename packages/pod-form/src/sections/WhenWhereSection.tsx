import { Alert, MenuItem, Stack, TextField } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import DateTimeField from '../components/DateTimeField';
import GoogleMapPreview from '../components/GoogleMapPreview';
import VenueSlotPicker from '../components/VenueSlotPicker';
import { usePodFormData } from '../context';
import type { PodFormValues } from '../types';

const venueLabel = (venue: any) => {
  const place = [venue.locality, venue.city].filter(Boolean).join(', ');
  return place ? `${venue.venue_name} - ${place}` : venue.venue_name;
};

export default function WhenWhereSection() {
  const { config, clubs, venues, getClubVenueIds, dateTimeFormat } = usePodFormData();
  const { control, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const clubId = useWatch({ control, name: 'club_id' });
  const venueId = useWatch({ control, name: 'venue_id' });
  const slotId = useWatch({ control, name: 'venue_slot_id' });
  const startDateTime = useWatch({ control, name: 'pod_date_time' });

  const linkedVenueIds = new Set(getClubVenueIds(clubs.find((club) => club.id === clubId)));
  const clubVenues = venues.filter((venue) => linkedVenueIds.has(venue.id));
  const selectedVenue = venues.find((venue) => venue.id === venueId);
  const now = new Date();
  const endMin = startDateTime && startDateTime > now ? startDateTime : now;
  const venueHint = clubVenues.length === 0
    ? 'No approved venues linked to this club.'
    : 'Only venues linked with this club are shown.';

  const handleVenueChange = (nextVenueId: string) => {
    setValue('venue_id', nextVenueId, { shouldValidate: true });
    setValue('location_id', '');
    setValue('zone_name', '');
    setValue('venue_slot_id', '');
    if (config.showVenueSlot) {
      setValue('pod_date_time', null);
      setValue('pod_end_date_time', null);
    }
  };

  const handleSlotPick = (slot: { id: string; start_at: string; end_at: string } | null) => {
    if (!slot) {
      setValue('venue_slot_id', '');
      setValue('pod_date_time', null);
      setValue('pod_end_date_time', null);
      return;
    }
    setValue('venue_slot_id', slot.id, { shouldValidate: true });
    setValue('pod_date_time', new Date(slot.start_at));
    setValue('pod_end_date_time', new Date(slot.end_at));
  };

  return (
    <Stack spacing={2}>
      <TextField
        select
        label="Venue"
        value={venueId}
        onChange={(event) => handleVenueChange(event.target.value)}
        fullWidth
        required
        disabled={!clubId}
        error={!!errors.venue_id}
        helperText={errors.venue_id?.message || (clubId ? venueHint : 'Pick a club in Basic Information first.')}
      >
        {clubVenues.map((venue) => (
          <MenuItem key={venue.id} value={venue.id}>
            {venueLabel(venue)}
          </MenuItem>
        ))}
      </TextField>

      {config.showVenueSlot ? (
        <>
          <VenueSlotPicker venueId={venueId} selectedSlotId={slotId} onSelect={handleSlotPick} />
          {errors.venue_slot_id && <Alert severity="error">{String(errors.venue_slot_id.message)}</Alert>}
        </>
      ) : (
        <>
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
            <DateTimeField control={control} name="pod_date_time" label="Start date & time" minDateTime={now} required format={dateTimeFormat} />
            <DateTimeField control={control} name="pod_end_date_time" label="End date & time" minDateTime={endMin} format={dateTimeFormat} />
          </Stack>
        </>
      )}
    </Stack>
  );
}
