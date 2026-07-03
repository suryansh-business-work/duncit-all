import { Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { MapEmbed } from '@/components/MapEmbed';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import { formatDurationBetween } from '@/utils/date-format';
import { DateTimeField } from '../DateTimeField';
import { SlotPicker } from '../SlotPicker';
import { VenuePicker } from '../VenuePicker';
import { VenueContactCard } from '../VenueContactCard';
import { parseDateTimeText } from '../create-pod.form';
import type { CreatePodForm, CreatePodSlot, CreatePodVenue } from '../create-pod.types';

const DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm';

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

interface Props {
  form: CreatePodForm;
  venues: CreatePodVenue[];
  viewerUserId: string;
}

/** Step 3 — pick a venue partner in the pod's city and book one of its
 * published availability slots (physical), or meeting details + schedule
 * (virtual). The slot sets the pod's date/time. mWeb twin. */
export function VenueSlotStep({ form, venues, viewerUserId }: Readonly<Props>) {
  const { control, watch, setValue } = form;
  const mode = watch('pod_mode');
  const locationId = watch('location_id');
  const venueId = watch('venue_id');
  const slotId = watch('venue_slot_id');

  const cityVenues = venues.filter((venue) => !locationId || venue.location_id === locationId);
  const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null;
  const ownVenue = Boolean(selectedVenue && selectedVenue.owner_user_id === viewerUserId);
  const spaces = venueSpaces(selectedVenue);
  const spaceLabel = watch('venue_space_label');
  const { slots, isLoading } = useVenueSlots(mode === 'PHYSICAL' ? venueId : '');

  // Each chip carries its own space, so picking one fills spots with no lookup.
  const pickSpace = (space: VenueSpace) => {
    setValue('venue_space_label', space.label, { shouldDirty: true });
    setValue('no_of_spots_text', String(space.capacity), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const duration = formatDurationBetween(
    parseDateTimeText(watch('pod_date_time_text')),
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
      <YStack gap={14}>
        <FormTextField control={control} name="meeting_platform" label="Meeting platform" />
        <FormTextField control={control} name="meeting_url" label="Meeting link" />
        <FormTextField control={control} name="meeting_notes" label="Meeting notes" multiline />
        <Controller
          control={control}
          name="pod_date_time_text"
          render={({ field, fieldState }) => (
            <DateTimeField
              label="Start date & time"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              testID="pod_date_time_text"
            />
          )}
        />
        <Controller
          control={control}
          name="pod_end_date_time_text"
          render={({ field, fieldState }) => (
            <DateTimeField
              label="End date & time (optional)"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              testID="pod_end_date_time_text"
            />
          )}
        />
        {duration ? (
          <Text testID="pod-duration" fontSize={12.5} fontWeight="800" color="$muted">
            Total duration: {duration}
          </Text>
        ) : null}
      </YStack>
    );
  }

  const mapQuery = selectedVenue
    ? [
        selectedVenue.venue_name,
        selectedVenue.address_line1,
        selectedVenue.locality,
        selectedVenue.city,
        selectedVenue.state,
        selectedVenue.postal_code,
        selectedVenue.country,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <YStack gap={14}>
      <Controller
        control={control}
        name="venue_id"
        render={({ field, fieldState }) => (
          <VenuePicker
            venues={cityVenues}
            selectedId={field.value}
            onSelect={(next) => {
              field.onChange(next);
              setValue('venue_slot_id', '', { shouldDirty: true });
              setValue('venue_space_label', '', { shouldDirty: true });
            }}
            error={fieldState.error?.message}
          />
        )}
      />
      {selectedVenue ? (
        <YStack
          gap={8}
          padding={12}
          borderRadius={12}
          backgroundColor="$surface"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <Text testID="create-pod-venue-capacity" fontSize={13} fontWeight="800" color="$color">
            {selectedVenue.venue_type ? `${selectedVenue.venue_type} · ` : ''}Total capacity:{' '}
            {selectedVenue.capacity ?? 0}
          </Text>
          {spaces.length > 0 ? (
            <YStack gap={6}>
              <Text fontSize={14} fontWeight="500" color="$color">
                Space &amp; capacity
              </Text>
              <XStack gap={6} flexWrap="wrap">
                {spaces.map((space) => {
                  const selected = spaceLabel === space.label;
                  return (
                    <XStack
                      key={space.label}
                      testID={`create-pod-space-${space.label}`}
                      role="button"
                      aria-label={`${space.label} ${space.capacity} spots`}
                      aria-pressed={selected}
                      onPress={() => pickSpace(space)}
                      paddingHorizontal={12}
                      paddingVertical={7}
                      borderRadius={999}
                      borderWidth={1}
                      borderColor={selected ? '$primary' : '$borderColor'}
                      backgroundColor={selected ? '$primary' : 'transparent'}
                      pressStyle={{ opacity: 0.85 }}
                    >
                      <Text
                        fontSize={12.5}
                        fontWeight="800"
                        color={selected ? '$onPrimary' : '$color'}
                      >
                        {space.label} · {space.capacity} spots
                      </Text>
                    </XStack>
                  );
                })}
              </XStack>
            </YStack>
          ) : (
            <Text fontSize={12} color="$muted">
              This venue hasn’t listed capacity — set No. of spots manually on the next step.
            </Text>
          )}
        </YStack>
      ) : null}
      {selectedVenue ? (
        <Controller
          control={control}
          name="venue_slot_id"
          render={({ fieldState }) => (
            <SlotPicker
              slots={slots}
              loading={isLoading}
              selectedSlotId={slotId}
              onPick={pickSlot}
              error={fieldState.error?.message}
            />
          )}
        />
      ) : null}
      {selectedVenue && slotId ? (
        <Text testID="create-pod-approval-note" fontSize={12.5} fontWeight="700" color="$muted">
          {ownVenue
            ? 'This is your venue — the slot books instantly and the pod goes live on publish.'
            : 'The pod goes live only after the venue approves this slot. The venue contact below is shared for follow-up.'}
        </Text>
      ) : null}
      {selectedVenue ? <VenueContactCard venue={selectedVenue} /> : null}
      {mapQuery ? <MapEmbed query={mapQuery} height={200} /> : null}
      {duration ? (
        <Text testID="pod-duration" fontSize={12.5} fontWeight="800" color="$muted">
          Pod window from slot: {duration}
        </Text>
      ) : null}
    </YStack>
  );
}
