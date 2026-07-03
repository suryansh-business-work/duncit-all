import { gql, useQuery } from '@apollo/client';
import { Controller } from 'react-hook-form';
import { Alert, FormHelperText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import VenueMapPreview from '../../../../components/VenueMapPreview';
import { formatDurationBetween } from '../../../../utils/dateFormat';
import SlotPicker from '../SlotPicker';
import VenuePicker from '../VenuePicker';
import VenueContactCard from '../VenueContactCard';
import VirtualMeetingFields from '../VirtualMeetingFields';
import type { CreatePodForm, CreatePodSlot, CreatePodVenue } from '../create-pod.types';

type VenueSpace = { label: string; capacity: number };

/** The venue's bookable spaces: its named capacity items, or the whole venue as
 * a single option when only a total capacity is set. Picking one fills spots. */
const venueSpaces = (venue: CreatePodVenue | null): VenueSpace[] => {
  if (!venue) return [];
  const items = venue.capacity_items ?? [];
  if (items.length > 0) return items;
  if (venue.capacity) return [{ label: 'Whole venue', capacity: venue.capacity }];
  return [];
};

export const VENUE_AVAILABLE_SLOTS = gql`
  query CreatePodVenueSlots($venue_id: ID!) {
    venueAvailableSlots(venue_id: $venue_id) {
      id
      start_at
      end_at
      price
      status
    }
  }
`;

interface Props {
  form: CreatePodForm;
  venues: CreatePodVenue[];
  viewerUserId: string;
}

/** Step 3 — pick a venue partner in the pod's city (card rail) and book one of
 * its published availability slots (physical), or meeting details + schedule
 * (virtual). The slot sets the pod's date/time. */
export default function VenueSlotStep({ form, venues, viewerUserId }: Readonly<Props>) {
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

  const cityVenues = venues.filter((venue) => !locationId || venue.location_id === locationId);
  const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null;
  const ownVenue = Boolean(selectedVenue && selectedVenue.owner_user_id === viewerUserId);
  const spaces = venueSpaces(selectedVenue);

  const pickSpace = (label: string) => {
    setValue('venue_space_label', label, { shouldDirty: true });
    const chosen = spaces.find((space) => space.label === label);
    if (chosen) setValue('no_of_spots', chosen.capacity, { shouldDirty: true, shouldValidate: true });
  };
  const selectVenue = (id: string) => {
    setValue('venue_id', id, { shouldDirty: true, shouldValidate: true });
    setValue('venue_slot_id', '', { shouldDirty: true });
    setValue('venue_space_label', '', { shouldDirty: true });
  };

  const slotsQuery = useQuery<{ venueAvailableSlots: CreatePodSlot[] }>(VENUE_AVAILABLE_SLOTS, {
    variables: { venue_id: venueId },
    skip: mode !== 'PHYSICAL' || !venueId,
    fetchPolicy: 'cache-and-network',
  });
  const slots = slotsQuery.data?.venueAvailableSlots ?? [];
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
      <VenuePicker venues={cityVenues} selectedId={venueId} onSelect={selectVenue} />
      {cityVenues.length === 0 && (
        <Alert severity="info">No venue partners are available in this location yet — pick another location or go virtual.</Alert>
      )}
      {errors.venue_id && <FormHelperText error>{errors.venue_id.message}</FormHelperText>}
      {selectedVenue && (
        <Stack spacing={1.5} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {selectedVenue.venue_type ? `${selectedVenue.venue_type} · ` : ''}Total capacity: {selectedVenue.capacity ?? 0}
          </Typography>
          {spaces.length > 0 ? (
            <Controller
              control={control}
              name="venue_space_label"
              render={({ field }) => (
                <TextField
                  select
                  label="Space & capacity"
                  fullWidth
                  value={field.value}
                  onChange={(e) => pickSpace(e.target.value)}
                  helperText="Pick a space — its capacity auto-fills No. of spots."
                >
                  {spaces.map((space) => (
                    <MenuItem key={space.label} value={space.label}>
                      {space.label} · {space.capacity} spots
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          ) : (
            <Typography variant="caption" color="text.secondary">
              This venue hasn’t listed capacity — set No. of spots manually on the next step.
            </Typography>
          )}
        </Stack>
      )}
      {selectedVenue && (
        <SlotPicker
          slots={slots}
          loading={slotsQuery.loading && !slotsQuery.data}
          selectedSlotId={slotId}
          onPick={pickSlot}
          error={errors.venue_slot_id?.message}
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
