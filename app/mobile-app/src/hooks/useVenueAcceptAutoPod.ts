import { useCallback, useEffect, useState } from 'react';
import type { AutoPodLabels } from '@duncit/utils';

import { AutoPodVenueSlotsDocument, VenueAcceptAutoPodDocument } from '@/graphql/auto-pods';
import type { AutoPodVenueOption } from '@/hooks/useAutoPodVenues';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

/** One of the venue's free slots, priced as the venue would be paid for it. */
export interface SlotOption {
  id: string;
  start_at: string;
  price: number;
  space_label: string;
  venue_receives: number;
  viable: boolean;
}

/**
 * The venue side of accepting an Auto Pod: which of the chosen venue's free
 * slots, and the one mutation that commits it.
 *
 * The venue itself is picked at the top of the queue, so the sheet only asks
 * for the slot. Slots come from `autoPodVenueSlots` — the next few days
 * (Pod Settings decides how many), nearest first, each carrying what the venue
 * would be paid after Finance's deductions and whether the pod's money could
 * cover it at all. A pinned offer only takes a venue from its own city; the
 * server refuses any other, so the sheet says so rather than listing slots.
 *
 * The RN twin of `@duncit/auto-pods`' `VenueAcceptDialog` (rule 27).
 */
export function useVenueAcceptAutoPod(
  autoPodId: string | null,
  venue: AutoPodVenueOption | null,
  pinnedLocationId: string | null,
  labels: AutoPodLabels,
  onAccepted: () => void,
) {
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [windowDays, setWindowDays] = useState(0);
  const [slotId, setSlotId] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const venueId = venue?.id ?? null;
  const venueInCity = !!venue && (!pinnedLocationId || venue.location_id === pinnedLocationId);

  // A fresh offer, or a different venue, is a fresh choice.
  useEffect(() => {
    setSlotId('');
    setFailure('');
    if (!autoPodId || !venueId || !venueInCity) {
      setSlots([]);
      setWindowDays(0);
      return;
    }
    let active = true;
    setSlotsLoading(true);
    graphqlRequest(
      AutoPodVenueSlotsDocument,
      { auto_pod_doc_id: autoPodId, venue_id: venueId },
      { auth: true },
    )
      .then((res) => {
        if (!active) return;
        setWindowDays(res.autoPodVenueSlots.window_days);
        setSlots(
          res.autoPodVenueSlots.slots.map((slot) => ({
            id: slot.id,
            start_at: slot.start_at,
            price: slot.price,
            space_label: slot.space_label,
            venue_receives: slot.venue_receives,
            viable: slot.viable,
          })),
        );
      })
      .catch(() => active && setFailure(labels.loadFailed))
      .finally(() => active && setSlotsLoading(false));
    return () => {
      active = false;
    };
  }, [autoPodId, venueId, venueInCity, labels.loadFailed]);

  const selected = slots.find((slot) => slot.id === slotId) ?? null;

  const accept = useCallback(async () => {
    if (!autoPodId || !venueId || !slotId) return;
    setBusy(true);
    setFailure('');
    try {
      await graphqlRequest(
        VenueAcceptAutoPodDocument,
        { auto_pod_doc_id: autoPodId, venue_id: venueId, slot_id: slotId },
        { auth: true },
      );
      onAccepted();
    } catch (err: unknown) {
      setFailure(toErrorMessage(err, labels.claimedElsewhere));
    } finally {
      setBusy(false);
    }
  }, [autoPodId, venueId, slotId, labels.claimedElsewhere, onAccepted]);

  return {
    slots,
    windowDays,
    slotId,
    selected,
    slotsLoading,
    busy,
    failure,
    setSlotId,
    accept,
    /** The chosen slot is one the pod's money can cover, and nothing is in flight. */
    canAccept: venueInCity && !!selected && selected.viable && !busy,
    /** Nothing free to commit — the sheet offers the availability screen instead. */
    showNoSlots: venueInCity && !slotsLoading && windowDays > 0 && slots.length === 0,
    /** The offer is pinned to a city this venue is not in. */
    venueInCity,
  };
}
