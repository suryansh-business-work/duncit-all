import { describe, expect, it } from 'vitest';
import {
  ADMIN_RENTAL_ITEMS_QUERY,
  MARK_RENTAL_BOOKING_MUTATION,
  MY_RENTED_ITEMS_PATH,
  OWNER_RENTAL_ITEMS_QUERY,
  RENTAL_ITEMS_CONFIG_QUERY,
  RENTABLE_PODS_QUERY,
  SET_VENUE_RENTAL_DEPOSIT_GST_MUTATION,
  UPDATE_VENUE_RENTALS_MUTATION,
  emptyRentalItem,
  isRentalListEditable,
  rentalItemsToValues,
  toVenueRentalsInput,
  POD_RENTALS_QUERY,
  canMarkRental,
  canRecordRentalRefund,
  checkoutRentalLines,
  rentalClosedKey,
  rentalMaxQuantity,
  rentalMoney,
  rentalLinePrice,
  rentalRefundKey,
  rentalSelectionTotals,
  rentalSelections,
  rentalStatusKey,
  rentalUnitKey,
  type PodRentalItem,
} from '../src/venue-rentals';

const racket: PodRentalItem = {
  id: 'racket',
  name: 'Racket',
  description: '',
  images: [],
  unit: 'SLOT',
  rate: 100,
  deposit: 300,
  available: 4,
  per_guest_limit: 2,
};
const projector: PodRentalItem = { ...racket, id: 'projector', name: 'Projector', unit: 'HOUR', rate: 250, deposit: 0 };

describe('rentalSelectionTotals', () => {
  it('charges a slot item once for the pod and an hour item for every hour, with deposits per unit', () => {
    const totals = rentalSelectionTotals([racket, projector], { racket: 2, projector: 1 }, 3);
    // 2 rackets × ₹100 + 1 projector × ₹250 × 3 hours; deposits 2 × ₹300.
    expect(totals).toEqual({ rent: 950, deposit: 600, total: 1550, count: 3 });
  });

  it('charges an hour item for at least one hour, as the server does', () => {
    expect(rentalSelectionTotals([projector], { projector: 1 }, 0).rent).toBe(250);
  });

  it('ignores zero, negative and unlisted picks', () => {
    const totals = rentalSelectionTotals([racket], { racket: 0, gone: 3 }, 2);
    expect(totals).toEqual({ rent: 0, deposit: 0, total: 0, count: 0 });
    expect(rentalSelectionTotals([racket], { racket: -1 }, 2).count).toBe(0);
  });
});

describe('rentalLinePrice', () => {
  const uno = { unit: 'HOUR' as const, rate: 50, deposit: 30 };

  it('prices an hour item as rate × hours × qty, with the deposit per unit kept apart', () => {
    expect(rentalLinePrice(uno, 1, 5)).toEqual({ units: 5, quantity: 1, rent: 250, deposit: 30 });
    expect(rentalLinePrice(uno, 2, 5)).toEqual({ units: 5, quantity: 2, rent: 500, deposit: 60 });
  });

  it('charges a slot item once whatever the pod length', () => {
    expect(rentalLinePrice({ ...uno, unit: 'SLOT' }, 2, 5)).toEqual({ units: 1, quantity: 2, rent: 100, deposit: 60 });
  });

  it('prices nothing for zero, negative or fractional-below-one quantities', () => {
    expect(rentalLinePrice(uno, 0, 5)).toEqual({ units: 5, quantity: 0, rent: 0, deposit: 0 });
    expect(rentalLinePrice(uno, -2, 5).rent).toBe(0);
    expect(rentalLinePrice(uno, 0.6, 5).quantity).toBe(0);
  });

  it('sums to the same total rentalSelectionTotals reports', () => {
    const item = { ...projector, deposit: 30, rate: 50 };
    const line = rentalLinePrice(item, 2, 5);
    expect(rentalSelectionTotals([item], { projector: 2 }, 5)).toEqual({
      rent: line.rent,
      deposit: line.deposit,
      total: 560,
      count: 2,
    });
  });
});

describe('rentalMaxQuantity', () => {
  it('allows the per-guest limit for every seat on the booking', () => {
    expect(rentalMaxQuantity({ available: 10, per_guest_limit: 2 }, 3)).toBe(6);
  });

  it('never allows more than is left for the pod', () => {
    expect(rentalMaxQuantity({ available: 3, per_guest_limit: 2 }, 3)).toBe(3);
    expect(rentalMaxQuantity({ available: 0, per_guest_limit: 2 }, 1)).toBe(0);
  });

  it('counts a missing or fractional seat count as one whole seat at least', () => {
    expect(rentalMaxQuantity({ available: 10, per_guest_limit: 2 }, 0)).toBe(2);
    expect(rentalMaxQuantity({ available: 10, per_guest_limit: 2 }, 2.7)).toBe(4);
  });
});

describe('rentalMoney', () => {
  it('prints whole rupees without paise and keeps paise when a claim has them', () => {
    expect(rentalMoney('₹', 1500)).not.toContain('.');
    expect(rentalMoney('₹', 1500)).toContain('₹');
    expect(rentalMoney('₹', 99.5)).toContain('99.50');
  });
});

describe('rentalSelections', () => {
  it('sends only the items actually picked', () => {
    expect(rentalSelections({ racket: 2, projector: 0 })).toEqual([{ item_id: 'racket', quantity: 2 }]);
  });
});

describe('rentalClosedKey', () => {
  it('says nothing while renting is open', () => {
    expect(rentalClosedKey({ open: true, closed_reason: null })).toBeNull();
  });

  it('names why renting closed', () => {
    expect(rentalClosedKey({ open: false, closed_reason: 'CUTOFF' })).toBe('venueRentals.guest.closedCutoff');
    expect(rentalClosedKey({ open: false, closed_reason: 'DISABLED' })).toBe('venueRentals.guest.closedDisabled');
    expect(rentalClosedKey({ open: false, closed_reason: 'NO_VENUE' })).toBe('venueRentals.guest.none');
  });
});

describe('row rules and labels', () => {
  it('lets only an item still out be marked, and only an owed refund be recorded', () => {
    expect(canMarkRental({ status: 'BOOKED' })).toBe(true);
    expect(canMarkRental({ status: 'RETURNED' })).toBe(false);
    expect(canRecordRentalRefund({ refund_status: 'DUE' })).toBe(true);
    expect(canRecordRentalRefund({ refund_status: 'IN_PAYMENT' })).toBe(false);
  });

  it('reads every label from the venueRentals namespace', () => {
    expect(rentalStatusKey('DAMAGED')).toBe('venueRentals.status.DAMAGED');
    expect(rentalRefundKey('PAID')).toBe('venueRentals.refund.PAID');
    expect(rentalUnitKey('HOUR')).toBe('venueRentals.unit.HOUR');
  });

  it('reads an unknown value as the first of its kind rather than a missing key', () => {
    expect(rentalStatusKey('LOST')).toBe('venueRentals.status.BOOKED');
    expect(rentalRefundKey(null)).toBe('venueRentals.refund.NONE');
    expect(rentalUnitKey(undefined)).toBe('venueRentals.unit.SLOT');
  });

  it('keeps the member history at one path every surface links to', () => {
    expect(MY_RENTED_ITEMS_PATH).toBe('/rented-items');
  });

  it('asks the server for the catalogue and answers a mark with the whole row', () => {
    expect(POD_RENTALS_QUERY).toContain('podRentals(pod_id: $pod_id)');
    expect(MARK_RENTAL_BOOKING_MUTATION).toContain('venue_amount');
  });
});

describe('the venue rental list', () => {
  const stored = {
    id: 'v1',
    venue_name: 'Smash Arena',
    status: 'APPROVED',
    offers_rentals: true,
    rental_terms_html: '<p>Return by 9 pm</p>',
    rental_deposit_gst: true,
    rental_items: [
      {
        id: 'i1',
        name: 'Racket',
        description: 'Carbon',
        images: ['a.jpg'],
        unit: 'SLOT' as const,
        rate: 100,
        deposit: 300,
        stock: 6,
        per_guest_limit: 2,
        is_available: true,
      },
    ],
  };

  it('opens the form on what is stored, without sharing the stored photo list', () => {
    const values = rentalItemsToValues(stored);
    expect(values.offers_rentals).toBe(true);
    expect(values.rental_terms_html).toBe('<p>Return by 9 pm</p>');
    // A venue read before terms existed opens with none.
    expect(rentalItemsToValues({ ...stored, rental_terms_html: undefined as unknown as string }).rental_terms_html).toBe('');
    expect(values.items[0]).toMatchObject({ id: 'i1', name: 'Racket', rate: 100 });
    values.items[0].images.push('b.jpg');
    expect(stored.rental_items[0].images).toEqual(['a.jpg']);
  });

  it('saves a kept item with its id and a new item without one, numbers as numbers and text trimmed', () => {
    const fresh = { ...emptyRentalItem(), name: '  Shoes ', rate: '80', deposit: '0', stock: '4', per_guest_limit: '1' };
    const input = toVenueRentalsInput({
      offers_rentals: true,
      rental_terms_html: '<p>Return by 9 pm</p>',
      items: [rentalItemsToValues(stored).items[0], fresh],
    });
    expect(input.rental_terms_html).toBe('<p>Return by 9 pm</p>');
    expect(input.rental_items[0]).toMatchObject({ id: 'i1', rate: 100 });
    expect(input.rental_items[1]).toEqual({
      name: 'Shoes',
      description: '',
      images: [],
      unit: 'SLOT',
      rate: 80,
      deposit: 0,
      stock: 4,
      per_guest_limit: 1,
      is_available: true,
    });
  });

  it('starts a new item available, per slot, one unit and no deposit', () => {
    expect(emptyRentalItem()).toMatchObject({ id: null, unit: 'SLOT', stock: 1, deposit: 0, is_available: true });
  });

  it('lets only an approved venue edit its listing', () => {
    expect(isRentalListEditable({ status: 'APPROVED' })).toBe(true);
    expect(isRentalListEditable({ status: 'PENDING' })).toBe(false);
  });

  it('saves through the approved-venue edit and reads the owner and admin copies', () => {
    expect(UPDATE_VENUE_RENTALS_MUTATION).toContain('updateApprovedVenue');
    expect(OWNER_RENTAL_ITEMS_QUERY).toContain('myVenue(venue_id: $venue_id)');
    expect(ADMIN_RENTAL_ITEMS_QUERY).toContain('venue(venue_doc_id: $venue_id)');
    expect(RENTAL_ITEMS_CONFIG_QUERY).toContain('rental_item_limit');
    expect(RENTABLE_PODS_QUERY).toContain('rentablePods(limit: $limit)');
    expect(SET_VENUE_RENTAL_DEPOSIT_GST_MUTATION).toContain('setVenueRentalDepositGst');
  });
});

describe('checkoutRentalLines', () => {
  const catalogue = {
    open: true,
    closed_reason: null,
    hours: 2,
    currency_symbol: '₹',
    venue_terms_html: '',
    items: [racket, projector],
  };

  it('prices only the picks the venue still lists and sends them as selections', () => {
    const { totals, selections } = checkoutRentalLines(catalogue, { racket: 1, gone: 4 });
    expect(totals).toEqual({ rent: 100, deposit: 300, total: 400, count: 1 });
    expect(selections).toEqual([{ item_id: 'racket', quantity: 1 }]);
  });

  it('carries nothing once renting closed, or before the catalogue loaded', () => {
    expect(checkoutRentalLines({ ...catalogue, open: false }, { racket: 1 }).selections).toEqual([]);
    expect(checkoutRentalLines(null, { racket: 1 }).totals.total).toBe(0);
  });
});
