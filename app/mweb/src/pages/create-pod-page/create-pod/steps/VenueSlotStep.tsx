import { gql, useQuery } from '@apollo/client';
import { Controller } from 'react-hook-form';
import { Alert, FormHelperText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import VenueMapPreview from '../../../../components/VenueMapPreview';
import { formatDurationBetween } from '../../../../utils/dateFormat';
import SlotPicker from '../SlotPicker';
import VenuePicker from '../VenuePicker';
import VenueContactCard from '../VenueContactCard';
import VirtualMeetingFields from '../VirtualMeetingFields';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import type { CreatePodForm, CreatePodSlot, CreatePodVenue } from '../create-pod.types';

/** `label` is what the host sees; `slotSpaceLabel` is the VenueSlot.space_label
 * this space books ('' = whole venue), used to filter the slot list. */
type VenueSpace = { label: string; capacity: number; slotSpaceLabel: string };

/** The venue's bookable spaces: its named capacity items, else the whole venue
 * as a single option. Always ≥1 when a venue is picked, so capacity selection is
 * always required before slots/prices show. Picking one fills No. of spots. */
const venueSpaces = (venue: CreatePodVenue | null): VenueSpace[] => {
  if (!venue) return [];
  const items = venue.capacity_items ?? [];
  if (items.length > 0) {
    return items.map((item) => ({ label: item.label, capacity: item.capacity, slotSpaceLabel: item.label }));
  }
  return [{ label: 'Whole venue', capacity: venue.capacity ?? 0, slotSpaceLabel: '' }];
};

export const VENUE_AVAILABLE_SLOTS = gql`
  query CreatePodVenueSlots($venue_id: ID!) {
    venueAvailableSlots(venue_id: $venue_id) {
      id
      start_at
      end_at
      price
      space_label
      capacity
      status
    }
  }
`;

interface Props {
  form: CreatePodForm;
  venues: CreatePodVenue[];
  /** Ids of the venues that match the selected club — the venue picker is scoped to these. */
  clubVenueIds: Set<string>;
  viewerUserId: string;
}

/** Step 3 — pick a venue partner in the pod's city (card rail) and book one of
 * its published availability slots (physical), or meeting details + schedule
 * (virtual). The slot sets the pod's date/time. */
export default function VenueSlotStep({ form, venues, clubVenueIds, viewerUserId }: Readonly<Props>) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const mode = watch('pod_mode');
  const locationId = watch('location_id');
  const venueId = watch('venue_id');
  const slotId = watch('venue_slot_id');
  const spaceLabel = watch('venue_space_label');

  // Venues are scoped to the selected club's auto-matched venues (location +
  // category), then to the pod's city.
  const clubVenues = venues.filter(
    (venue) => clubVenueIds.has(venue.id) && (!locationId || venue.location_id === locationId)
  );
  const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null;
  const ownVenue = Boolean(selectedVenue?.owner_user_id === viewerUserId);
  const spaces = venueSpaces(selectedVenue);
  const selectedSpace = spaces.find((space) => space.label === spaceLabel) ?? null;

  const pickSpace = (label: string) => {
    setValue('venue_space_label', label, { shouldDirty: true, shouldValidate: true });
    // Changing the space invalidates any slot picked under the old space.
    setValue('venue_slot_id', '', { shouldDirty: true });
    const chosen = spaces.find((space) => space.label === label);
    if (chosen) setValue('no_of_spots', chosen.capacity, { shouldDirty: true, shouldValidate: true });
  };
  const selectVenue = (id: string) => {
    setValue('venue_id', id, { shouldDirty: true, shouldValidate: true });
    setValue('venue_slot_id', '', { shouldDirty: true });
    setValue('venue_space_label', '', { shouldDirty: true });
    setValue('no_of_spots', 0, { shouldDirty: true });
  };

  const slotsQuery = useQuery<{ venueAvailableSlots: CreatePodSlot[] }>(VENUE_AVAILABLE_SLOTS, {
    variables: { venue_id: venueId },
    skip: mode !== 'PHYSICAL' || !venueId,
    fetchPolicy: 'cache-and-network',
  });
  const slots = slotsQuery.data?.venueAvailableSlots ?? [];
  // Only the picked space's slots — and only once a space is chosen (so no price
  // shows before a capacity is selected).
  const slotsForSpace = selectedSpace
    ? slots.filter((slot) => (slot.space_label ?? '') === selectedSpace.slotSpaceLabel)
    : [];
  const duration = formatDurationBetween(watch('pod_date_time'), watch('pod_end_date_time'));

  const pickSlot = (slot: CreatePodSlot) => {
    setValue('venue_slot_id', slot.id, { shouldDirty: true, shouldValidate: true });
    // The slot window is the pod window — the server enforces the same.
    setValue('pod_date_time', new Date(slot.start_at), { shouldDirty: true, shouldValidate: true });
    setValue('pod_end_date_time', new Date(slot.end_at), { shouldDirty: true });
  };

  if (mode !== 'PHYSICAL') {
    return <VirtualMeetingFields form={form} />;
  }

  return (
    <Stack spacing={2}>
      <VenuePicker venues={clubVenues} selectedId={venueId} onSelect={selectVenue} required />
      {clubVenues.length === 0 && (
        <Alert severity="info">No venues match this club yet — pick another club or go virtual.</Alert>
      )}
      {errors.venue_id && <FormHelperText error>{errors.venue_id.message}</FormHelperText>}
      {selectedVenue && (
        <Stack spacing={1.5} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {selectedVenue.venue_type ? `${selectedVenue.venue_type} · ` : ''}Total capacity: {selectedVenue.capacity ?? 0}
          </Typography>
          <Controller
            control={control}
            name="venue_space_label"
            render={({ field }) => (
              <TextField
                select
                label={requiredLabel('Space & capacity', true)}
                fullWidth
                value={field.value}
                onChange={(e) => pickSpace(e.target.value)}
                error={!!errors.venue_space_label}
                helperText={errors.venue_space_label?.message || 'Pick a space — its capacity sets No. of spots. Slots show after this.'}
              >
                {spaces.map((space) => (
                  <MenuItem key={space.label} value={space.label}>
                    {space.label} · {space.capacity} spots
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Stack>
      )}
      {selectedVenue && selectedSpace && (
        <SlotPicker
          slots={slotsForSpace}
          loading={slotsQuery.loading && !slotsQuery.data}
          selectedSlotId={slotId}
          onPick={pickSlot}
          error={errors.venue_slot_id?.message}
          required
        />
      )}
      {selectedVenue && slotId && (
        <Alert severity={ownVenue ? 'success' : 'info'}>
          {ownVenue
            ? 'This is your venue — the slot books instantly and the pod goes live on publish.'
            : 'The pod goes live only after the venue approves this slot. The venue contact below is shared for follow-up.'}
        </Alert>
      )}
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
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
          Pod window from slot: {duration}
        </Typography>
      )}
    </Stack>
  );
}
