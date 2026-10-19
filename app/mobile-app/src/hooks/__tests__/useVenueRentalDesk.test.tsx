import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  MarkRentalBookingDocument,
  OwnerRentalItemsDocument,
  UpdateVenueRentalsDocument,
  VenueRentalDeskDocument,
} from '@/graphql/venue-rentals-desk';
import { useVenueRentalBookings, useVenueRentalItems } from '@/hooks/useVenueRentalDesk';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const AUTH = { auth: true };

const ITEM = {
  id: 'i1',
  name: 'Racket',
  description: '',
  images: [],
  unit: 'HOUR',
  rate: 100,
  deposit: 200,
  stock: 4,
  per_guest_limit: 2,
  is_available: true,
  categories: [],
};
const CONFIG = {
  rental_units: ['SLOT', 'HOUR', 'SOMETHING'],
  rental_item_limit: 20,
  rental_image_limit: 4,
  rental_rate_max: 50000,
  rental_deposit_max: 50000,
  rental_stock_max: 500,
  rental_per_guest_max: 20,
  rental_terms_max: 20000,
  rental_category_limit: 5,
};
const VENUE = {
  id: 'v1',
  venue_name: 'Court Nine',
  status: 'APPROVED',
  offers_rentals: true,
  rental_terms_html: '<p>Mine</p>',
  rental_deposit_gst: false,
  rental_items: [ITEM, { ...ITEM, id: 'i2', unit: 'SLOT' }],
};

beforeEach(() => mockRequest.mockReset());

describe('useVenueRentalItems', () => {
  it('loads the venue’s items and the editor’s caps, reading generated enums as plain strings', async () => {
    mockRequest.mockResolvedValue({ myVenue: VENUE, venueRegistrationConfig: CONFIG });
    const { result } = renderHook(() => useVenueRentalItems('v1'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.venue).not.toBeNull());
    expect(mockRequest).toHaveBeenCalledWith(OwnerRentalItemsDocument, { venue_id: 'v1' }, AUTH);
    expect(result.current.venue).toEqual({
      ...VENUE,
      rental_items: [ITEM, { ...ITEM, id: 'i2', unit: 'SLOT' }],
    });
    // An unknown unit from a newer server reads as per slot.
    expect(result.current.config?.rental_units).toEqual(['SLOT', 'HOUR', 'SLOT']);
    expect(result.current.loading).toBe(false);
  });

  it('reads a venue the account cannot see as no venue', async () => {
    mockRequest.mockResolvedValue({ myVenue: null, venueRegistrationConfig: CONFIG });
    const { result } = renderHook(() => useVenueRentalItems('v1'));
    await waitFor(() => expect(result.current.config).not.toBeNull());
    expect(result.current.venue).toBeNull();
  });

  it('flags a failed load', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useVenueRentalItems('v1'));
    await waitFor(() => expect(result.current.failed).toBe(true));
  });

  it('saves the whole list with the venue’s terms and keeps what the server stored', async () => {
    mockRequest.mockResolvedValueOnce({ myVenue: VENUE, venueRegistrationConfig: CONFIG });
    const { result } = renderHook(() => useVenueRentalItems('v1'));
    await waitFor(() => expect(result.current.venue).not.toBeNull());

    mockRequest.mockResolvedValueOnce({
      updateApprovedVenue: {
        offers_rentals: false,
        rental_terms_html: '<p>Saved</p>',
        rental_items: [{ ...ITEM, id: 'new-id', unit: 'HOUR' }],
      },
    });
    await act(() =>
      result.current.save({
        offers_rentals: false,
        rental_terms_html: '<p>Saved</p>',
        items: [
          {
            ...ITEM,
            id: null,
            name: ' Racket ',
            unit: 'HOUR',
            rate: '100',
            deposit: '200',
            stock: '4',
            per_guest_limit: '2',
          },
          { ...ITEM, id: 'i2', unit: 'SLOT' },
        ],
      }),
    );

    expect(mockRequest).toHaveBeenLastCalledWith(
      UpdateVenueRentalsDocument,
      {
        venue_id: 'v1',
        input: {
          offers_rentals: false,
          rental_terms_html: '<p>Saved</p>',
          rental_items: [
            expect.objectContaining({ name: 'Racket', unit: 'HOUR', rate: 100, stock: 4 }),
            expect.objectContaining({ id: 'i2', unit: 'SLOT' }),
          ],
        },
      },
      AUTH,
    );
    // A new item has no id to send; the server gives it one.
    expect(mockRequest.mock.calls[1][1].input.rental_items[0]).not.toHaveProperty('id');
    expect(result.current.venue).toMatchObject({
      offers_rentals: false,
      rental_terms_html: '<p>Saved</p>',
      rental_items: [{ id: 'new-id', unit: 'HOUR' }],
      // The tax switch is the Venues console's; saving items never touches it.
      rental_deposit_gst: false,
    });
  });

  it('a save before anything loaded keeps the venue empty', async () => {
    mockRequest.mockResolvedValueOnce({ myVenue: null, venueRegistrationConfig: CONFIG });
    const { result } = renderHook(() => useVenueRentalItems('v1'));
    await waitFor(() => expect(result.current.config).not.toBeNull());

    mockRequest.mockResolvedValueOnce({
      updateApprovedVenue: { offers_rentals: true, rental_terms_html: '', rental_items: [] },
    });
    await act(() =>
      result.current.save({ offers_rentals: true, rental_terms_html: '', items: [] }),
    );
    expect(result.current.venue).toBeNull();
  });
});

const booking = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  status: 'BOOKED',
  ...over,
});
const STATS = {
  bookings: 2,
  open: 2,
  rent_total: 600,
  deposits_held: 400,
  earned: 0,
  paid_out: 0,
  currency_symbol: '₹',
};

describe('useVenueRentalBookings', () => {
  it('loads the newest bookings and the venue’s numbers', async () => {
    mockRequest.mockResolvedValue({
      venueRentalBookingsTable: { rows: [booking('b1'), booking('b2')] },
      venueRentalStats: STATS,
      publicRentalSettings: { deposit_refundable: true },
    });
    const { result } = renderHook(() => useVenueRentalBookings('v1'));

    await waitFor(() => expect(result.current.bookings).toHaveLength(2));
    expect(mockRequest).toHaveBeenCalledWith(
      VenueRentalDeskDocument,
      { venue_id: 'v1', query: { page: 1, page_size: 50 } },
      AUTH,
    );
    expect(result.current.stats).toEqual(STATS);
    // Finance's rule rides the same read: the mark sheet says what the venue hands back.
    expect(result.current.depositRefundable).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('marks a booking, updates its row, and reloads the numbers', async () => {
    mockRequest.mockResolvedValueOnce({
      venueRentalBookingsTable: { rows: [booking('b1'), booking('b2')] },
      venueRentalStats: STATS,
      publicRentalSettings: { deposit_refundable: true },
    });
    const { result } = renderHook(() => useVenueRentalBookings('v1'));
    await waitFor(() => expect(result.current.bookings).toHaveLength(2));

    mockRequest
      .mockResolvedValueOnce({
        markRentalBooking: { id: 'b2', status: 'DAMAGED', damage_claim: 150 },
      })
      .mockResolvedValueOnce({
        venueRentalBookingsTable: { rows: [booking('b1'), booking('b2', { status: 'DAMAGED' })] },
        venueRentalStats: { ...STATS, open: 1 },
      });
    await act(() =>
      result.current.mark('b2', { outcome: 'DAMAGED', damage_claim: 150, note: 'Cracked frame' }),
    );

    expect(mockRequest).toHaveBeenCalledWith(
      MarkRentalBookingDocument,
      { id: 'b2', input: { outcome: 'DAMAGED', damage_claim: 150, note: 'Cracked frame' } },
      AUTH,
    );
    expect(result.current.bookings?.[1]).toMatchObject({ id: 'b2', status: 'DAMAGED' });
    expect(result.current.stats?.open).toBe(1);
  });

  it('sends a return as RETURNED', async () => {
    mockRequest.mockResolvedValue({
      venueRentalBookingsTable: { rows: [] },
      venueRentalStats: STATS,
      publicRentalSettings: { deposit_refundable: true },
    });
    const { result } = renderHook(() => useVenueRentalBookings('v1'));
    await waitFor(() => expect(result.current.bookings).toEqual([]));

    mockRequest.mockResolvedValueOnce({ markRentalBooking: { id: 'b1', status: 'RETURNED' } });
    await act(() =>
      result.current.mark('b1', { outcome: 'RETURNED', damage_claim: null, note: null }),
    );
    expect(mockRequest).toHaveBeenCalledWith(
      MarkRentalBookingDocument,
      { id: 'b1', input: { outcome: 'RETURNED', damage_claim: null, note: null } },
      AUTH,
    );
  });

  it('flags a failed load and lets the caller retry', async () => {
    mockRequest.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useVenueRentalBookings('v1'));
    await waitFor(() => expect(result.current.failed).toBe(true));

    mockRequest.mockResolvedValueOnce({
      venueRentalBookingsTable: { rows: [] },
      venueRentalStats: STATS,
      publicRentalSettings: { deposit_refundable: true },
    });
    await act(() => result.current.refetch());
    expect(result.current.failed).toBe(false);
    expect(result.current.bookings).toEqual([]);
  });
});
