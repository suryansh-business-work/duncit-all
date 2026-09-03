import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { VenueSlotConflictMode } from '@/generated/graphql/graphql';
import {
  CreateVenueSlotsDocument,
  DeleteVenueSlotDocument,
  UpdateVenueSlotDocument,
  VenueSlotsDocument,
} from '@/graphql/venue-availability';
import { graphqlRequest } from '@/services/graphql.client';

export type VenueSlot = ResultOf<typeof VenueSlotsDocument>['venueSlots'][number];

/** The payload the day sheet builds for a new slot. */
export interface NewVenueSlotInput {
  start_at: string;
  end_at: string;
  whole_day: boolean;
  price: number;
  notes: string;
  space_label: string;
  capacity: number;
}

/** The instants a month's fetch covers, as ISO strings. */
export interface SlotRange {
  from: string;
  to: string;
}

/**
 * The venue owner's slot operations over one visible month — the RN twin of
 * `useVenueSlots` in @duncit/availability-calendar (rule 27). The read, plus
 * the three writes the day sheet fires, each followed by a refetch so the grid
 * and the sheet never show a slot the server no longer has.
 */
export function useOwnerVenueSlots(venueId: string | null, range: SlotRange) {
  const [slots, setSlots] = useState<VenueSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!venueId) {
      setSlots([]);
      return undefined;
    }
    let active = true;
    setIsLoading(true);
    graphqlRequest(
      VenueSlotsDocument,
      { venue_id: venueId, from: range.from, to: range.to },
      { auth: true },
    )
      .then((data) => {
        if (!active) return;
        setSlots(data.venueSlots);
        setError(null);
      })
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : null))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [venueId, range.from, range.to, attempt]);

  // REPLACE only ever arrives after the sheet's overwrite warning; FAIL keeps
  // an accidental clash a refusal rather than a silent deletion.
  const create = useCallback(
    async (input: NewVenueSlotInput, overwrite: boolean) => {
      if (!venueId) return;
      await graphqlRequest(
        CreateVenueSlotsDocument,
        {
          input: {
            venue_id: venueId,
            slots: [input],
            on_conflict: overwrite ? VenueSlotConflictMode.Replace : VenueSlotConflictMode.Fail,
          },
        },
        { auth: true },
      );
      refetch();
    },
    [venueId, refetch],
  );

  const toggleBlock = useCallback(
    async (slot: VenueSlot) => {
      await graphqlRequest(
        UpdateVenueSlotDocument,
        { slot_id: slot.id, input: { block: slot.status !== 'BLOCKED' } },
        { auth: true },
      );
      refetch();
    },
    [refetch],
  );

  const remove = useCallback(
    async (slotId: string) => {
      await graphqlRequest(DeleteVenueSlotDocument, { slot_id: slotId }, { auth: true });
      refetch();
    },
    [refetch],
  );

  return { slots, isLoading, error, refetch, create, toggleBlock, remove };
}
