import { useQuery } from '@apollo/client/react';
import SlotPicker from '../SlotPicker';
import { VENUE_AVAILABLE_SLOTS } from '../venueSlots';
import type { CreatePodForm, CreatePodSlot } from '../create-pod.types';
import type { VenueSpace } from './venueSpaces';

interface Props {
  form: CreatePodForm;
  space: VenueSpace;
}

/**
 * A Pod Request's pod books the slot that request holds — the only pods that
 * still book a venue slot by id. Its slot is only listed when the request's id
 * is sent. Every other pod sends the venue an offer (VenueOfferPicker).
 */
export default function RequestSlotPicker({ form, space }: Readonly<Props>) {
  const { watch, setValue, formState } = form;
  const slotsQuery = useQuery(VENUE_AVAILABLE_SLOTS, {
    variables: { venue_id: watch('venue_id'), partner_request_id: watch('partner_request_id') || null },
    fetchPolicy: 'cache-and-network',
  });
  const slots = (slotsQuery.data?.venueAvailableSlots ?? []).filter(
    (slot) => (slot.space_label ?? '') === space.slotSpaceLabel
  );

  const pickSlot = (slot: CreatePodSlot) => {
    setValue('venue_slot_id', slot.id, { shouldDirty: true, shouldValidate: true });
    // The slot window is the pod window — the server enforces the same.
    setValue('pod_date_time', new Date(slot.start_at), { shouldDirty: true, shouldValidate: true });
    setValue('pod_end_date_time', new Date(slot.end_at), { shouldDirty: true });
  };

  return (
    <SlotPicker
      slots={slots}
      loading={slotsQuery.loading && !slotsQuery.data}
      selectedSlotId={watch('venue_slot_id')}
      onPick={pickSlot}
      error={formState.errors.venue_slot_id?.message}
      required
    />
  );
}
