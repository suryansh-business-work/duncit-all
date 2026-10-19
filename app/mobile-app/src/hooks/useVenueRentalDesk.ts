import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import type { RentalItemsConfig, RentalItemsValues, RentalsVenue } from '@duncit/utils';
import { toVenueRentalsInput } from '@duncit/utils';

import {
  MarkRentalBookingDocument,
  OwnerRentalItemsDocument,
  UpdateVenueRentalsDocument,
  VenueRentalDeskDocument,
} from '@/graphql/venue-rentals-desk';
import { RentalMarkOutcome, VenueRentalUnit } from '@/generated/graphql/graphql';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { graphqlRequest } from '@/services/graphql.client';

type OwnerResult = ResultOf<typeof OwnerRentalItemsDocument>;
type DeskResult = ResultOf<typeof VenueRentalDeskDocument>;
export type DeskBooking = DeskResult['venueRentalBookingsTable']['rows'][number];
export type DeskStats = DeskResult['venueRentalStats'];

/** The newest bookings the desk lists — a venue marks the recent ones. */
const DESK_PAGE_SIZE = 50;

const unitOf = (raw: unknown): 'SLOT' | 'HOUR' => (String(raw) === 'HOUR' ? 'HOUR' : 'SLOT');

/** The generated enums are TS enums; the shared contract reads plain strings. */
function toRentalsVenue(venue: NonNullable<OwnerResult['myVenue']>): RentalsVenue {
  return {
    id: venue.id,
    venue_name: venue.venue_name,
    status: String(venue.status),
    offers_rentals: venue.offers_rentals,
    rental_terms_html: venue.rental_terms_html,
    rental_deposit_gst: venue.rental_deposit_gst,
    rental_items: venue.rental_items.map((item) => ({ ...item, unit: unitOf(item.unit) })),
  };
}

const toConfig = (config: OwnerResult['venueRegistrationConfig']): RentalItemsConfig => ({
  ...config,
  rental_units: config.rental_units.map(unitOf),
});

/** The venue's rented items and the editor's caps; saving writes the whole list. */
export function useVenueRentalItems(venueId: string) {
  const [venue, setVenue] = useState<RentalsVenue | null>(null);
  const [config, setConfig] = useState<RentalItemsConfig | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const data = await graphqlRequest(
      OwnerRentalItemsDocument,
      { venue_id: venueId },
      { auth: true },
    );
    setVenue(data.myVenue ? toRentalsVenue(data.myVenue) : null);
    setConfig(toConfig(data.venueRegistrationConfig));
    setFailed(false);
  }, [venueId]);
  const query = useReloadableQuery(load, { onError: () => setFailed(true) });

  const save = useCallback(
    async (values: RentalItemsValues) => {
      const input = toVenueRentalsInput(values);
      const data = await graphqlRequest(
        UpdateVenueRentalsDocument,
        {
          venue_id: venueId,
          input: {
            ...input,
            rental_items: input.rental_items.map((item) => ({
              ...item,
              unit: item.unit === 'HOUR' ? VenueRentalUnit.Hour : VenueRentalUnit.Slot,
            })),
          },
        },
        { auth: true },
      );
      const saved = data.updateApprovedVenue;
      setVenue((current) =>
        current
          ? {
              ...current,
              offers_rentals: saved.offers_rentals,
              rental_terms_html: saved.rental_terms_html,
              rental_items: saved.rental_items.map((item) => ({
                ...item,
                unit: unitOf(item.unit),
              })),
            }
          : current,
      );
    },
    [venueId],
  );

  return {
    venue,
    config,
    failed,
    loading: query.isLoading && !venue,
    refetch: query.refetch,
    save,
  };
}

/** The venue's recent bookings and its numbers; a mark updates its row in place. */
export function useVenueRentalBookings(venueId: string) {
  const [bookings, setBookings] = useState<DeskBooking[] | null>(null);
  const [stats, setStats] = useState<DeskStats | null>(null);
  // Finance's rule: whether the venue hands deposits back at the venue.
  const [depositRefundable, setDepositRefundable] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const data = await graphqlRequest(
      VenueRentalDeskDocument,
      // The table's own default order is newest first.
      { venue_id: venueId, query: { page: 1, page_size: DESK_PAGE_SIZE } },
      { auth: true },
    );
    setBookings(data.venueRentalBookingsTable.rows);
    setStats(data.venueRentalStats);
    setDepositRefundable(data.publicRentalSettings.deposit_refundable);
    setFailed(false);
  }, [venueId]);
  const query = useReloadableQuery(load, { onError: () => setFailed(true) });

  const mark = useCallback(
    async (
      id: string,
      input: { outcome: 'RETURNED' | 'DAMAGED'; damage_claim: number | null; note: string | null },
    ) => {
      const data = await graphqlRequest(
        MarkRentalBookingDocument,
        {
          id,
          input: {
            ...input,
            outcome:
              input.outcome === 'DAMAGED' ? RentalMarkOutcome.Damaged : RentalMarkOutcome.Returned,
          },
        },
        { auth: true },
      );
      const marked = data.markRentalBooking;
      setBookings((rows) =>
        (rows ?? []).map((row) => (row.id === marked.id ? { ...row, ...marked } : row)),
      );
      // The numbers move with the mark (earned, items out).
      await load();
    },
    [load],
  );

  return {
    bookings,
    stats,
    depositRefundable,
    failed,
    loading: query.isLoading && !bookings,
    refetch: query.refetch,
    mark,
  };
}
