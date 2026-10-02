import { Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { Text, YStack } from 'tamagui';

import { MapEmbed } from '@/components/MapEmbed';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import { formatDurationBetween } from '@/utils/date-format';
import { SlotPicker } from '../../SlotPicker';
import { VirtualMeetingFields } from '../../VirtualMeetingFields';
import { VenuePicker } from '../../VenuePicker';
import { VenueContactCard } from '../../VenueContactCard';
import { parseDateTimeText } from '../../create-pod.form';
import type { CreatePodForm, CreatePodSlot, CreatePodVenue } from '../../create-pod.types';

import { SlotApprovalNote, VenueSpaceCard } from './VenueSpaceCard';
import { spaceSlots, venueMapQuery, venueSpaces, type VenueSpace } from './venueSpaces';

interface Props {
  form: CreatePodForm;
  venues: CreatePodVenue[];
  /** Ids of the venues that match the selected club — the venue picker is scoped to these. */
  clubVenueIds: Set<string>;
  viewerUserId: string;
}

/** Step 3 — pick a venue partner in the pod's city and book one of its
 * published availability slots (physical), or meeting details + schedule
 * (virtual). The slot sets the pod's date/time. mWeb twin. */
export function VenueSlotStep({ form, venues, clubVenueIds, viewerUserId }: Readonly<Props>) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const { t } = useTranslation();
  const { dateTimeInputFormat } = useDateFormat();
  const spaceError = errors.venue_space_label?.message;
  const mode = watch('pod_mode');
  const locationId = watch('location_id');
  const venueId = watch('venue_id');
  const slotId = watch('venue_slot_id');

  // Venues are scoped to the selected club's auto-matched venues, then the city.
  const clubVenues = venues.filter(
    (venue) => clubVenueIds.has(venue.id) && (!locationId || venue.location_id === locationId),
  );
  const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null;
  const ownVenue = selectedVenue?.owner_user_id === viewerUserId;
  const spaces = venueSpaces(selectedVenue);
  const spaceLabel = watch('venue_space_label');
  const selectedSpace = spaces.find((space) => space.label === spaceLabel) ?? null;
  const { slots, isLoading } = useVenueSlots(mode === 'PHYSICAL' ? venueId : '');
  const slotsForSpace = spaceSlots(slots, selectedSpace);

  // Each chip carries its own space, so picking one fills spots with no lookup.
  const pickSpace = (space: VenueSpace) => {
    setValue('venue_space_label', space.label, { shouldDirty: true, shouldValidate: true });
    // Changing the space invalidates any slot picked under the old space.
    setValue('venue_slot_id', '', { shouldDirty: true });
    setValue('no_of_spots_text', String(space.capacity), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const startDateTime = parseDateTimeText(watch('pod_date_time_text'));
  const duration = formatDurationBetween(
    startDateTime,
    parseDateTimeText(watch('pod_end_date_time_text')),
  );

  // A slot fills the schedule boxes, so it must be written in the same shape
  // those boxes are typed in — the admin's patterns, not a fixed ISO one.
  const pickSlot = (slot: CreatePodSlot) => {
    setValue('venue_slot_id', slot.id, { shouldDirty: true, shouldValidate: true });
    // The slot window is the pod window — the server enforces the same.
    setValue('pod_date_time_text', format(new Date(slot.start_at), dateTimeInputFormat), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('pod_end_date_time_text', format(new Date(slot.end_at), dateTimeInputFormat), {
      shouldDirty: true,
    });
  };

  if (mode !== 'PHYSICAL') {
    return (
      <VirtualMeetingFields control={control} startDateTime={startDateTime} duration={duration} />
    );
  }

  const mapQuery = venueMapQuery(selectedVenue);

  return (
    <YStack gap={16}>
      <Controller
        control={control}
        name="venue_id"
        render={({ field, fieldState }) => (
          <VenuePicker
            venues={clubVenues}
            selectedId={field.value}
            onSelect={(next) => {
              field.onChange(next);
              setValue('venue_slot_id', '', { shouldDirty: true });
              setValue('venue_space_label', '', { shouldDirty: true });
              setValue('no_of_spots_text', '0', { shouldDirty: true });
            }}
            error={fieldState.error?.message}
            required
          />
        )}
      />
      {selectedVenue ? (
        <VenueSpaceCard
          venue={selectedVenue}
          spaces={spaces}
          spaceLabel={spaceLabel}
          spaceError={spaceError}
          onPick={pickSpace}
        />
      ) : null}
      {selectedVenue && selectedSpace ? (
        <Controller
          control={control}
          name="venue_slot_id"
          render={({ fieldState }) => (
            <SlotPicker
              slots={slotsForSpace}
              loading={isLoading}
              selectedSlotId={slotId}
              onPick={pickSlot}
              error={fieldState.error?.message}
              required
            />
          )}
        />
      ) : null}
      {selectedVenue && slotId ? <SlotApprovalNote ownVenue={ownVenue} /> : null}
      {selectedVenue ? <VenueContactCard venue={selectedVenue} /> : null}
      {mapQuery ? <MapEmbed query={mapQuery} height={200} /> : null}
      {duration ? (
        <Text testID="pod-duration" fontSize={14} fontWeight="600" color="$muted">
          {t('mweb.createPod.podWindow', { vars: { duration } })}
        </Text>
      ) : null}
    </YStack>
  );
}
