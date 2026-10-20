import { Controller } from 'react-hook-form';
import { Alert, FormHelperText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import VenueMapPreview from '../../../../components/VenueMapPreview';
import { formatDurationBetween } from '../../../../utils/dateFormat';
import type { FreePodVenueNotice } from '@duncit/utils';
import FreeVenueNote from '../FreeVenueNote';
import { VENUE_AVAILABLE_SLOTS } from '../venueSlots';
import VenuePicker from '../VenuePicker';
import VenueContactCard from '../VenueContactCard';
import InstantBookingPicker from './InstantBookingPicker';
import RequestSlotPicker from './RequestSlotPicker';
import { venueSpaces, type VenueSpace } from './venueSpaces';
import VirtualMeetingFields from '../VirtualMeetingFields';
import PodRepeatSection from '../fields/PodRepeatSection';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';
import type { CreatePodForm, CreatePodVenue } from '../create-pod.types';

// Re-exported: the stepper's pricing query and its tests import them from here.
export { VENUE_AVAILABLE_SLOTS, venueSpaces, type VenueSpace };

interface Props {
  form: CreatePodForm;
  venues: CreatePodVenue[];
  /** Ids of the venues that match the selected club — the venue picker is scoped to these. */
  clubVenueIds: Set<string>;
  /** A free pod on a priced slot: the host settles with the venue directly. */
  venueNotice: FreePodVenueNotice;
}

/** Step 3 — pick a venue partner in the pod's city (card rail) and book it
 * instantly at its own pricing (physical), or meeting details + schedule
 * (virtual). A Pod Request's pod keeps the slot that request holds. The booked
 * window sets the pod's date/time. */
export default function VenueSlotStep({ form, venues, clubVenueIds, venueNotice }: Readonly<Props>) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const { t } = useTranslation();
  const mode = watch('pod_mode');
  const locationId = watch('location_id');
  const venueId = watch('venue_id');
  const spaceLabel = watch('venue_space_label');
  // Only the whole-venue pseudo-space carries copy of ours; a named capacity
  // item is the venue partner's own wording and is shown as they typed it.
  const spaceName = (space: VenueSpace) =>
    space.slotSpaceLabel ? space.label : t('mweb.slots.wholeVenue');

  // Venues are scoped to the selected club's auto-matched venues (location +
  // category), then to the pod's city.
  const clubVenues = venues.filter(
    (venue) => clubVenueIds.has(venue.id) && (!locationId || venue.location_id === locationId)
  );
  const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null;
  // A Pod Request's pod books the slot that request holds; every other pod books instantly.
  const fromRequest = Boolean(watch('partner_request_id'));
  const spaces = venueSpaces(selectedVenue);
  const selectedSpace = spaces.find((space) => space.label === spaceLabel) ?? null;

  const pickSpace = (label: string) => {
    setValue('venue_space_label', label, { shouldDirty: true, shouldValidate: true });
    // Changing the space invalidates any time picked under the old space.
    clearTime();
    const chosen = spaces.find((space) => space.label === label);
    if (chosen) setValue('no_of_spots', chosen.capacity, { shouldDirty: true, shouldValidate: true });
  };
  function clearTime() {
    setValue('venue_slot_id', '', { shouldDirty: true });
    if (fromRequest) return;
    setValue('pod_date_time', null, { shouldDirty: true });
    setValue('pod_end_date_time', null, { shouldDirty: true });
    setValue('venue_booking_pax', 0, { shouldDirty: true });
    setValue('venue_booking_pets', false, { shouldDirty: true });
  }
  const selectVenue = (id: string) => {
    setValue('venue_id', id, { shouldDirty: true, shouldValidate: true });
    clearTime();
    setValue('venue_space_label', '', { shouldDirty: true });
    setValue('no_of_spots', 0, { shouldDirty: true });
  };

  const duration = formatDurationBetween(watch('pod_date_time'), watch('pod_end_date_time'));

  if (mode !== 'PHYSICAL') {
    // Recurring: the repeat details follow the first date (virtual window).
    return <Stack spacing={2}><VirtualMeetingFields form={form} /><PodRepeatSection form={form} /></Stack>;
  }

  return (
    <Stack data-testid="create-pod-venue-slot-step" spacing={2}>
      <VenuePicker venues={clubVenues} selectedId={venueId} onSelect={selectVenue} required />
      {clubVenues.length === 0 && <Alert data-testid="create-pod-no-venues" severity="info">{t('mweb.createPod.noVenues')}</Alert>}
      {errors.venue_id && <FormHelperText data-testid="venue_id-error" error>{errors.venue_id.message}</FormHelperText>}
      {selectedVenue && (
        <Stack spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }}>
          <Typography data-testid="create-pod-venue-capacity" variant="body2" sx={{ fontWeight: 600 }}>
            {selectedVenue.venue_type ? `${selectedVenue.venue_type} · ` : ''}
            {t('mweb.createPod.totalCapacity', { vars: { count: selectedVenue.capacity ?? 0 } })}
          </Typography>
          <Controller
            control={control}
            name="venue_space_label"
            render={({ field }) => (
              <TextField
                data-testid="venue_space_label"
                select
                label={requiredLabel(t('mweb.createPod.spaceCapacity'), true)}
                fullWidth
                value={field.value}
                onChange={(e) => pickSpace(e.target.value)}
                error={!!errors.venue_space_label}
                helperText={errors.venue_space_label?.message || t('mweb.createPod.spaceHint')}
              >
                {spaces.map((space) => (
                  <MenuItem key={space.label} value={space.label} data-testid={`venue-space-option-${space.label}`}>
                    {t('mweb.createPod.spaceOption', { vars: { label: spaceName(space), capacity: space.capacity } })}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Stack>
      )}
      {selectedVenue && selectedSpace && !fromRequest && (
        <InstantBookingPicker form={form} venueId={selectedVenue.id} spaceLabel={selectedSpace.label} />
      )}
      {selectedVenue && selectedSpace && fromRequest && <RequestSlotPicker form={form} space={selectedSpace} />}
      <PodRepeatSection form={form} />
      <FreeVenueNote notice={venueNotice} />
      {selectedVenue && <VenueContactCard venue={selectedVenue} />}
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
      {duration && (
        <Typography data-testid="create-pod-window-duration" variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {t('mweb.createPod.podWindow', { vars: { duration } })}
        </Typography>
      )}
    </Stack>
  );
}
