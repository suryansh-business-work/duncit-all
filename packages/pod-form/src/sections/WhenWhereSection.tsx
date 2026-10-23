import { Alert, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import DateTimeField from '../components/DateTimeField';
import GoogleMapPreview from '../components/GoogleMapPreview';
import FreePodVenueNote from '../slots/FreePodVenueNote';
import OfferTermsField from '../slots/OfferTermsField';
import VenueOfferField from '../slots/VenueOfferField';
import { usePodFormData } from '../context';
import type { PodFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

const venueLabel = (venue: any) => {
  const place = [venue.locality, venue.city].filter(Boolean).join(', ');
  return place ? `${venue.venue_name} - ${place}` : venue.venue_name;
};

export default function WhenWhereSection() {
  const { t } = useTranslation();
  const { config, clubs, venues, getClubVenueIds, dateFormatter, slotLabels } = usePodFormData();
  const { control, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const clubId = useWatch({ control, name: 'club_id' });
  const venueId = useWatch({ control, name: 'venue_id' });
  const slotId = useWatch({ control, name: 'venue_slot_id' });
  const startDateTime = useWatch({ control, name: 'pod_date_time' });
  const endDateTime = useWatch({ control, name: 'pod_end_date_time' });

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

  // A picked window is an offer to the venue: the slot an edited pod held (if
  // any) is let go only when the new offer is saved.
  const handleWindow = (start: string, end: string) => {
    setValue('venue_slot_id', '');
    setValue('pod_date_time', new Date(start), { shouldValidate: true });
    setValue('pod_end_date_time', new Date(end), { shouldValidate: true });
  };
  const held =
    slotId && startDateTime
      ? `${dateFormatter.formatDate(startDateTime)} ${dateFormatter.formatTime(startDateTime)}`
      : '';

  return (
    <Stack spacing={2}>
      <TextField
        select
        label={t('podForm.whenWhereSection.venue')}
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
          {held && (
            <Typography variant="body2" data-testid="pod-form-held-slot" sx={{ color: 'text.secondary' }}>
              {slotLabels.currentlyBooked}: {held}
            </Typography>
          )}
          <VenueOfferField venueId={venueId} start={slotId ? null : startDateTime} end={slotId ? null : endDateTime} onWindow={handleWindow} />
          {errors.venue_slot_id && <Alert severity="error">{String(errors.venue_slot_id.message)}</Alert>}
          {venueId && !slotId && <OfferTermsField venueId={venueId} />}
          <FreePodVenueNote />
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
            <DateTimeField control={control} name="pod_date_time" label={t('podForm.common.startDateAndTime')} minDateTime={now} required />
            <DateTimeField control={control} name="pod_end_date_time" label={t('podForm.common.endDateAndTime')} minDateTime={endMin} />
          </Stack>
        </>
      )}
    </Stack>
  );
}
