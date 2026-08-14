import { Controller, type Control } from 'react-hook-form';
import { addMinutes, format } from 'date-fns';
import { Text, XStack, YStack } from 'tamagui';

import { FieldLabel } from '@/components/Field';
import { FormTextField } from '@/components/FormTextField';
import { MapEmbed } from '@/components/MapEmbed';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import { formatDurationBetween } from '@/utils/date-format';
import { SlotPicker } from '../SlotPicker';
import { VirtualMeetingFields } from '../VirtualMeetingFields';
import { VenuePicker } from '../VenuePicker';
import { VenueContactCard } from '../VenueContactCard';
import { MIN_POD_DURATION_MINUTES, parseDateTimeText } from '../create-pod.form';
import type {
  CreatePodForm,
  CreatePodFormValues,
  CreatePodSlot,
  CreatePodVenue,
} from '../create-pod.types';

const DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm';

/** `label` is what the host sees; `slotSpaceLabel` is the VenueSlot.space_label
 * this space books ('' = whole venue), used to filter the slot list. */
type VenueSpace = { label: string; capacity: number; slotSpaceLabel: string };

/** The venue's bookable spaces: its named capacity items, else the whole venue
 * as a single option. Always ≥1 when a venue is picked, so capacity selection is
 * always required before slots/prices show. Picking one fills No. of spots.
 *
 * The whole-venue `label` stays in English on purpose: it is the value stored on
 * the form (and in the draft) that identifies the space, so translating it would
 * stop a draft resumed in another language from matching. It is translated where
 * it is DISPLAYED instead. */
const venueSpaces = (venue: CreatePodVenue | null): VenueSpace[] => {
  if (!venue) return [];
  const items = venue.capacity_items ?? [];
  if (items.length > 0) {
    return items.map((item) => ({
      label: item.label,
      capacity: item.capacity,
      slotSpaceLabel: item.label,
    }));
  }
  return [{ label: 'Whole venue', capacity: venue.capacity ?? 0, slotSpaceLabel: '' }];
};

/** Only the picked space's slots — and only once a space is chosen (so no price
 * shows before a capacity is selected). */
const spaceSlots = (slots: CreatePodSlot[], space: VenueSpace | null): CreatePodSlot[] => {
  if (!space) return [];
  return slots.filter((slot) => (slot.space_label ?? '') === space.slotSpaceLabel);
};

/** The venue address the map pins, as one line. */
const venueMapQuery = (venue: CreatePodVenue | null): string => {
  if (!venue) return '';
  return [
    venue.venue_name,
    venue.address_line1,
    venue.locality,
    venue.city,
    venue.state,
    venue.postal_code,
    venue.country,
  ]
    .filter(Boolean)
    .join(', ');
};

/** One bookable space — its capacity is the pod's No. of spots. `name` is the
 * space as the host reads it (the whole-venue pseudo-space is ours to word; a
 * named capacity item is the venue partner's own). */
function SpaceChip({
  space,
  name,
  selected,
  onPick,
}: Readonly<{
  space: VenueSpace;
  name: string;
  selected: boolean;
  onPick: (space: VenueSpace) => void;
}>) {
  const { t } = useTranslation();
  const label = t('mweb.createPod.spaceOption', {
    vars: { label: name, capacity: space.capacity },
  });
  return (
    <XStack
      testID={`create-pod-space-${space.label}`}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPress={() => onPick(space)}
      paddingHorizontal={12}
      paddingVertical={7}
      borderRadius={999}
      borderWidth={1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor={selected ? '$primary' : 'transparent'}
      pressStyle={{ opacity: 0.85 }}
    >
      <Text fontSize={12.5} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

/** The picked venue's total capacity + its bookable spaces (slots follow). */
function VenueSpaceCard({
  venue,
  spaces,
  spaceLabel,
  spaceError,
  onPick,
}: Readonly<{
  venue: CreatePodVenue;
  spaces: VenueSpace[];
  spaceLabel: string;
  spaceError?: string;
  onPick: (space: VenueSpace) => void;
}>) {
  const { t } = useTranslation();
  const spaceName = (space: VenueSpace) =>
    space.slotSpaceLabel ? space.label : t('mweb.slots.wholeVenue');
  return (
    <YStack
      gap={8}
      padding={12}
      borderRadius={12}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <Text testID="create-pod-venue-capacity" fontSize={13} fontWeight="600" color="$color">
        {venue.venue_type ? `${venue.venue_type} · ` : ''}
        {t('mweb.createPod.totalCapacity', { vars: { count: venue.capacity ?? 0 } })}
      </Text>
      <YStack gap={6}>
        <FieldLabel label={t('mweb.createPod.spaceCapacity')} required testID="create-pod-space" />
        <XStack gap={6} flexWrap="wrap">
          {spaces.map((space) => (
            <SpaceChip
              key={space.label}
              space={space}
              name={spaceName(space)}
              selected={spaceLabel === space.label}
              onPick={onPick}
            />
          ))}
        </XStack>
        <Text fontSize={12} color={spaceError ? '$danger' : '$muted'}>
          {spaceError ?? t('mweb.createPod.spaceHint')}
        </Text>
      </YStack>
    </YStack>
  );
}

/** Own venues book instantly; every other venue approves the slot first. */
function SlotApprovalNote({ ownVenue }: Readonly<{ ownVenue: boolean }>) {
  const { t } = useTranslation();
  return (
    <Text testID="create-pod-approval-note" fontSize={12.5} fontWeight="700" color="$muted">
      {ownVenue ? t('mweb.createPod.ownVenueNote') : t('mweb.createPod.venueApprovalNote')}
    </Text>
  );
}

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

  const pickSlot = (slot: CreatePodSlot) => {
    setValue('venue_slot_id', slot.id, { shouldDirty: true, shouldValidate: true });
    // The slot window is the pod window — the server enforces the same.
    setValue('pod_date_time_text', format(new Date(slot.start_at), DATE_TIME_FORMAT), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('pod_end_date_time_text', format(new Date(slot.end_at), DATE_TIME_FORMAT), {
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
    <YStack gap={14}>
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
        <Text testID="pod-duration" fontSize={12.5} fontWeight="600" color="$muted">
          {t('mweb.createPod.podWindow', { vars: { duration } })}
        </Text>
      ) : null}
    </YStack>
  );
}
