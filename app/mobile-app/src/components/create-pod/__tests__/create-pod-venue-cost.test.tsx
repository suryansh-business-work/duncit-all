import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { renderHook } from '@testing-library/react-native';

import { useVenueCost } from '@/components/create-pod/CreatePodStepper/useVenueCost';
import { venueOfferOf, venueOfferPriceOf } from '@/components/create-pod/create-pod.form';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
  type CreatePodVenue,
} from '@/components/create-pod/create-pod.types';
import { useOfferQuote } from '@/hooks/useOfferQuote';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import { appFormatter } from '@/utils/app-formatter';

jest.mock('@/hooks/useOfferQuote', () => ({ useOfferQuote: jest.fn() }));
jest.mock('@/hooks/useVenueSlots', () => ({ useVenueSlots: jest.fn() }));
const mockQuote = useOfferQuote as jest.Mock;
const mockSlots = useVenueSlots as jest.Mock;

const HOUR_MS = 3_600_000;
const typed = (hours: number) =>
  format(new Date(Date.now() + hours * HOUR_MS), appFormatter().dateTimeInputFormat);

const venue: CreatePodVenue = {
  id: 'v1',
  venue_name: 'Hall',
  capacity: 20,
  capacity_items: [{ label: 'Rooftop', capacity: 6 }],
  offer_min_guests: 8,
};

const breakdown = (pax: number, payout: number, fee: number) => ({
  model: 'PER_GUEST',
  rate: 300,
  pax,
  hours: 2,
  base: payout,
  rules: [],
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  gst_pct: 0,
  taxes: 0,
  platform_fee_pct: 5,
  platform_fee: fee,
  venue_payout: payout,
  total: payout + fee,
  deposit: 0,
});

/** A per-guest offer for 20 spots in the 6-guest Rooftop space, with an ask. */
const offerValues: Partial<CreatePodFormValues> = {
  pod_mode: 'PHYSICAL',
  venue_id: 'v1',
  venue_space_label: 'Rooftop',
  pod_date_time_text: typed(24),
  pod_end_date_time_text: typed(26),
  no_of_spots_text: '20',
  venue_offer_model: 'PER_GUEST',
  venue_offer_rate: '300',
  venue_offer_offerings: 'Projector',
  venue_offer_note: 'Quiet please',
};

const idle = { quote: null, quoteMin: null, message: null, loading: false, error: null };

function useHarness(values: Partial<CreatePodFormValues>) {
  const form = useForm<CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...values },
  });
  return useVenueCost(form, [venue]);
}

beforeEach(() => {
  mockQuote.mockReset().mockReturnValue(idle);
  mockSlots.mockReset().mockReturnValue({ slots: [], isLoading: false });
});

describe('venueOfferPriceOf', () => {
  it('prices the offer without its points or note, which the offer itself carries', () => {
    const values = { ...blankCreatePodForm, ...offerValues };
    const priced = venueOfferPriceOf(values);
    expect(priced).toEqual(
      expect.objectContaining({ space_label: 'Rooftop', pax: 20, model: 'PER_GUEST', rate: 300 }),
    );
    expect(priced).not.toHaveProperty('offerings');
    expect(priced).not.toHaveProperty('note');
    expect(venueOfferOf(values)).toEqual(
      expect.objectContaining({ offerings: ['Projector'], note: 'Quiet please' }),
    );
  });

  it('is null until the offer is complete', () => {
    expect(venueOfferPriceOf({ ...blankCreatePodForm, ...offerValues, venue_offer_rate: '' })).toBe(
      null,
    );
  });
});

describe('useVenueCost', () => {
  it('asks the quote without the ask, and floors an offer at the minimum the space allows', () => {
    const { result } = renderHook(() => useHarness(offerValues));
    const [venueId, asked] = mockQuote.mock.calls.at(-1) ?? [];
    expect(venueId).toBe('v1');
    expect(asked).not.toHaveProperty('offerings');
    // The venue takes 8, but the Rooftop holds only 6.
    expect(result.current.offerMinGuests).toBe(6);
    expect(result.current.bookedCapacity).toBe(6);
    expect(result.current.amount).toBeNull();
    expect(result.current.offerEarnings).toBeNull();
    expect(mockSlots).toHaveBeenLastCalledWith('', '');
  });

  it("sends the offer's money at both ends of its guests once it is priced", () => {
    mockQuote.mockReturnValue({
      ...idle,
      quote: breakdown(20, 6000, 300),
      quoteMin: breakdown(6, 1800, 90),
    });
    const { result } = renderHook(() => useHarness(offerValues));
    expect(result.current.amount).toBe(6300);
    expect(result.current.offerEarnings).toEqual({
      venue_amount: 6000,
      venue_commission_on_top: 300,
      min_spots: 6,
      venue_amount_at_min: 1800,
      venue_commission_on_top_at_min: 90,
    });
  });

  it('sends only the one end while no low-end price or spots are known', () => {
    mockQuote.mockReturnValue({ ...idle, quote: breakdown(20, 6000, 300), quoteMin: null });
    const { result } = renderHook(() => useHarness({ ...offerValues, no_of_spots_text: '' }));
    expect(result.current.offerEarnings).toEqual({
      venue_amount: 6000,
      venue_commission_on_top: 300,
    });
  });

  it('sends only the one end when the venue names no minimum below the spots', () => {
    const quote = breakdown(20, 6000, 300);
    mockQuote.mockReturnValue({ ...idle, quote, quoteMin: quote });
    const { result } = renderHook(() => useHarness(offerValues));
    expect(result.current.offerEarnings).toEqual({
      venue_amount: 6000,
      venue_commission_on_top: 300,
    });
  });

  it('prices a held slot by its own price and capacity, with no offer and no minimum', () => {
    mockSlots.mockReturnValue({
      slots: [{ id: 's1', price: 400, capacity: 12 }],
      isLoading: false,
    });
    const { result } = renderHook(() =>
      useHarness({ ...offerValues, venue_slot_id: 's1', partner_request_id: 'r1' }),
    );
    expect(mockSlots).toHaveBeenLastCalledWith('v1', 'r1');
    expect(mockQuote).toHaveBeenLastCalledWith('v1', null);
    expect(result.current).toEqual(
      expect.objectContaining({
        amount: 400,
        bookedCapacity: 12,
        offerMinGuests: 0,
        offerEarnings: null,
      }),
    );
  });

  it('reads no price for a held slot that is no longer listed', () => {
    const { result } = renderHook(() => useHarness({ ...offerValues, venue_slot_id: 'gone' }));
    expect(result.current.amount).toBeNull();
    expect(result.current.bookedCapacity).toBeUndefined();
  });

  it('names no minimum for a Pod Request still picking its slot, or a virtual pod', () => {
    const request = renderHook(() => useHarness({ ...offerValues, partner_request_id: 'r1' }));
    expect(request.result.current.offerMinGuests).toBe(0);
    const virtual = renderHook(() => useHarness({ ...offerValues, pod_mode: 'VIRTUAL' }));
    expect(virtual.result.current.offerMinGuests).toBe(0);
    expect(mockQuote).toHaveBeenLastCalledWith('', null);
  });
});
