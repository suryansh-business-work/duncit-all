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
import { FreeVenueNote } from '../../FreeVenueNote';
import type { FreePodVenueNotice, SpotsBounds } from '@duncit/utils';

import { InstantBookingPicker } from './InstantBookingPicker';
import type { VenueQuoteState } from './VenueQuoteCard';
import { VenueSpaceCard } from './VenueSpaceCard';
import { spaceSlots, venueMapQuery, venueSpaces, type VenueSpace } from './venueSpaces';

interface Props {
  form: CreatePodForm;
  venues: CreatePodVenue[];
  /** Ids of the venues that match the selected club — the venue picker is scoped to these. */
  clubVenueIds: Set<string>;
  /** The server's quote for the picked window (the stepper owns it). */
  venueQuote: VenueQuoteState;
  currencySymbol: string;
  /** A Pod Request's venue — always offered, whatever club or city is picked. */
  pinnedVenueId?: string;
  /** A free pod on a priced slot: the host settles with the venue directly. */
  venueNotice: FreePodVenueNotice;
  /** A club admin is creating the pod for a host — the note speaks of the host. */
  forClubAdmin?: boolean;
  /** The range the pod's spots may take — picked here, with the booking. */
  spots: SpotsBounds;
}

/** Step 3 — pick a venue partner in the pod's city and book it instantly at
 * its own pricing (physical), or meeting details + schedule (virtual). A Pod
 * Request's pod keeps the slot that request holds. The booked window sets the
 * pod's date/time. mWeb twin. */
export function VenueSlotStep({
  form,
  venues,
  clubVenueIds,
  venueQuote,
  currencySymbol,
  pinnedVenueId,
  venueNotice,
  forClubAdmin = false,
  spots,
}: Readonly<Props>) {
  const { control, watch, setValue, formState } = form;
  const { errors } = formState;
  const { t } = useTranslation();
  const { dateTimeInputFormat } = useDateFormat();
  const spaceError = errors.venue_space_label?.message;
  const mode = watch('pod_mode');
  const locationId = watch('location_id');
  const venueId = watch('venue_id');
  const slotId = watch('venue_slot_id');

  // Venues are scoped to the selected club's auto-matched venues, then the city;
  // a Pod Request's venue stays on offer regardless.
  const clubVenues = venues.filter(
    (venue) =>
      venue.id === pinnedVenueId ||
      (clubVenueIds.has(venue.id) && (!locationId || venue.location_id === locationId)),
  );
  const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null;
  // A Pod Request's pod books the slot that request holds; every other pod —
  // a club admin's edit too — books instantly (a held slot is kept until a new
  // window is picked).
  const bookBySlot = Boolean(watch('partner_request_id'));
  const spaces = venueSpaces(selectedVenue);
  const spaceLabel = watch('venue_space_label');
  const selectedSpace = spaces.find((space) => space.label === spaceLabel) ?? null;
  const { slots, isLoading } = useVenueSlots(
    mode === 'PHYSICAL' && bookBySlot ? venueId : '',
    watch('partner_request_id'),
  );
  const slotsForSpace = spaceSlots(slots, selectedSpace);

  // Each chip carries its own space, so picking one fills spots with no lookup.
  const pickSpace = (space: VenueSpace) => {
    setValue('venue_space_label', space.label, { shouldDirty: true, shouldValidate: true });
    // Changing the space invalidates any time picked under the old space.
    clearTime();
    setValue('no_of_spots_text', String(space.capacity), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  function clearTime() {
    setValue('venue_slot_id', '', { shouldDirty: true });
    if (bookBySlot) return;
    setValue('pod_date_time_text', '', { shouldDirty: true });
    setValue('pod_end_date_time_text', '', { shouldDirty: true });
    setValue('venue_booking_pets', false, { shouldDirty: true });
  }

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
              clearTime();
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
      {selectedVenue && selectedSpace && !bookBySlot ? (
        <InstantBookingPicker
          form={form}
          venueId={selectedVenue.id}
          spaceLabel={selectedSpace.label}
          quote={venueQuote}
          currencySymbol={currencySymbol}
          spots={spots}
        />
      ) : null}
      {selectedVenue && selectedSpace && bookBySlot ? (
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
      <FreeVenueNote notice={venueNotice} forClubAdmin={forClubAdmin} />
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
