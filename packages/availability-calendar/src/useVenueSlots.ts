import { useMutation, useQuery } from '@apollo/client/react';
import { CREATE_VENUE_SLOTS, DELETE_VENUE_SLOT, UPDATE_VENUE_SLOT, VENUE_SLOTS } from './queries';
import type { NewSlotInput, VenueSlotRow } from './types';

/**
 * The venue owner's slot operations over one visible range: the read, plus
 * the three writes the day drawer fires, each followed by a refetch so the
 * calendar and the drawer never show a slot the server no longer has.
 */
export function useVenueSlots(venueId: string, range: { from: Date; to: Date }) {
  const { data, loading, error, refetch } = useQuery<{ venueSlots: VenueSlotRow[] }>(VENUE_SLOTS, {
    variables: { venue_id: venueId, from: range.from.toISOString(), to: range.to.toISOString() },
    fetchPolicy: 'cache-and-network',
    // Stated rather than inherited: `refetch` is what every write below ends
    // with, and only this option makes that round trip observable as `loading`.
    // Apollo 4 defaults it to true, but the package's peer range starts at 3,
    // where the default is false — and there the refresh would show nothing.
    notifyOnNetworkStatusChange: true,
  });

  const [createSlots] = useMutation<{ createVenueSlots: { id: string }[] }>(CREATE_VENUE_SLOTS);
  const [updateSlot] = useMutation<{ updateVenueSlot: { id: string } }>(UPDATE_VENUE_SLOT);
  const [deleteSlot] = useMutation<{ deleteVenueSlot: boolean }>(DELETE_VENUE_SLOT);

  // REPLACE only ever arrives after the drawer's overwrite warning; FAIL keeps
  // an accidental clash a refusal rather than a silent deletion.
  const create = async (input: NewSlotInput, overwrite: boolean) => {
    await createSlots({
      variables: {
        input: { venue_id: venueId, slots: [input], on_conflict: overwrite ? 'REPLACE' : 'FAIL' },
      },
    });
    await refetch();
  };
  const toggleBlock = async (slot: VenueSlotRow) => {
    await updateSlot({ variables: { slot_id: slot.id, input: { block: slot.status !== 'BLOCKED' } } });
    await refetch();
  };
  const remove = async (slotId: string) => {
    await deleteSlot({ variables: { slot_id: slotId } });
    await refetch();
  };

  return {
    slots: data?.venueSlots ?? [],
    /** True until the first answer — the calendar shows a spinner, not an empty month. */
    pending: loading && !data,
    /**
     * A re-read of a month that is already drawn — which is how every write
     * above ends. The counts on the grid are stale for exactly that round trip,
     * so the calendar dims rather than disappears: blocking a slot should read
     * as the grid catching up, not as the page reloading under the owner.
     */
    refreshing: loading && !!data,
    error,
    refetch,
    create,
    toggleBlock,
    remove,
  };
}
