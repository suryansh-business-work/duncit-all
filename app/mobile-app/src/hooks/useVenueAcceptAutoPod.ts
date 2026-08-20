import { useCallback, useEffect, useState } from 'react';
import type { AutoPodLabels } from '@duncit/utils';

import { VenueAcceptAutoPodDocument } from '@/graphql/auto-pods';
import { VenueAvailableSlotsDocument } from '@/graphql/create-pod';
import { VenueDashboardDocument } from '@/graphql/studio-dashboard';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

/** A venue the owner may accept with — approved and still switched on. */
export interface VenueOption {
  id: string;
  venue_name: string;
}

/** One free slot on the chosen venue; accepting commits exactly one. */
export interface SlotOption {
  id: string;
  start_at: string;
  price: number;
  space_label: string;
}

/**
 * The venue side of accepting an Auto Pod: which venue, which of its free
 * slots, and the one mutation that commits both.
 *
 * Accepting and committing a slot are ONE step — an acceptance with no date
 * would leave hosts and club admins nothing to enrol against — so the sheet
 * cannot submit until both are chosen, and the server enforces the same.
 *
 * The venue and slot lists come from documents the app already ships
 * (`VenueDashboardDocument`, `VenueAvailableSlotsDocument`) rather than new
 * copies of the same two queries (rule 34).
 */
export function useVenueAcceptAutoPod(
  autoPodId: string | null,
  labels: AutoPodLabels,
  onAccepted: () => void,
) {
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [venueId, setVenueId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  // A fresh offer is a fresh decision — never inherit the venue or slot picked
  // for the row this sheet showed last time.
  useEffect(() => {
    setVenueId('');
    setSlotId('');
    setFailure('');
  }, [autoPodId]);

  useEffect(() => {
    if (!autoPodId) return;
    let active = true;
    graphqlRequest(VenueDashboardDocument, undefined, { auth: true })
      .then((res) => {
        if (!active) return;
        const approved = res.myVenues
          .filter((venue) => String(venue.status) === 'APPROVED' && venue.is_active)
          .map((venue) => ({ id: venue.id, venue_name: venue.venue_name }));
        setVenues(approved);
        // One venue is not a choice — preselect it.
        const only = approved.length === 1 ? approved[0] : undefined;
        if (only) setVenueId(only.id);
      })
      .catch(() => active && setFailure(labels.loadFailed));
    return () => {
      active = false;
    };
  }, [autoPodId, labels.loadFailed]);

  useEffect(() => {
    // Clearing here as well as on the row change: a slot belongs to the venue
    // it was listed under, so switching venues must drop the previous pick.
    setSlotId('');
    if (!autoPodId || !venueId) {
      setSlots([]);
      return;
    }
    let active = true;
    setSlotsLoading(true);
    graphqlRequest(VenueAvailableSlotsDocument, { venue_id: venueId }, { auth: true })
      .then((res) => {
        if (!active) return;
        setSlots(
          res.venueAvailableSlots.map((slot) => ({
            id: slot.id,
            start_at: slot.start_at,
            price: slot.price,
            space_label: slot.space_label,
          })),
        );
      })
      .catch(() => active && setFailure(labels.loadFailed))
      .finally(() => active && setSlotsLoading(false));
    return () => {
      active = false;
    };
  }, [autoPodId, venueId, labels.loadFailed]);

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
    venues,
    slots,
    venueId,
    slotId,
    slotsLoading,
    busy,
    failure,
    setVenueId,
    setSlotId,
    accept,
    /** Nothing free to commit — the sheet offers the availability screen instead. */
    showNoSlots: !!venueId && !slotsLoading && slots.length === 0,
  };
}
