/**
 * The spots a venue offer may be for, and the money the Pricing step is asked about.
 *
 * Spots ARE the offer's guests, and the server refuses an offer below the
 * venue's minimum (BELOW_VENUE_MINIMUM) — never more than the space holds, so
 * the floor is capped there too. A Pod Request's held slot was agreed already
 * and a virtual pod books nothing, so neither is floored by it. The offer's
 * money reaches the earnings preview at both ends of its guests.
 */
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import type { VenueQuote } from '@duncit/utils';

import { useStepperSelections } from '../CreatePodStepper/useStepperSelections';
import { blankCreatePodForm, type CreatePodFormValues, type CreatePodVenue } from '../create-pod.types';
import { VENUE_OFFER_QUOTE } from '../venueOffer';

const VENUE: CreatePodVenue = { id: 'venue-1', venue_name: 'Court House', capacity: 40, offer_min_guests: 8 };
const SMALL_ROOM: CreatePodVenue = {
  id: 'venue-2',
  venue_name: 'Studio',
  capacity_items: [{ label: 'Studio room', capacity: 6 }],
  offer_min_guests: 8,
};
const START = new Date('2030-06-01T10:00:00.000Z');
const END = new Date('2030-06-01T12:00:00.000Z');

const offerValues = (over: Partial<CreatePodFormValues> = {}): Partial<CreatePodFormValues> => ({
  pod_mode: 'PHYSICAL',
  venue_id: 'venue-1',
  venue_space_label: 'Whole venue',
  pod_date_time: START,
  pod_end_date_time: END,
  no_of_spots: 20,
  venue_offer_model: 'PER_GUEST',
  venue_offer_rate: '300',
  ...over,
});

const quoteAt = (pax: number, payout: number, fee: number): VenueQuote => ({
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
  platform_fee_pct: 10,
  platform_fee: fee,
  venue_payout: payout,
  total: payout + fee,
  deposit: 0,
});

const quoteMock: MockedResponse = {
  request: { query: VENUE_OFFER_QUOTE, variables: () => true },
  result: {
    data: { venueOfferQuote: { ok: true, message: null, quote: quoteAt(20, 6000, 600), quote_min: quoteAt(8, 2400, 240) } },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

function selections(values: Partial<CreatePodFormValues>, mocks: MockedResponse[] = []) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {children}
    </MockedProvider>
  );
  return renderHook(
    () => {
      const form = useForm<CreatePodFormValues, unknown, CreatePodFormValues>({
        defaultValues: { ...blankCreatePodForm, ...values },
      });
      return useStepperSelections(form, {
        clubs: [],
        hostCategories: [],
        products: [],
        subCategories: [],
        venues: [VENUE, SMALL_ROOM],
        viewerUserId: 'u-host',
      });
    },
    { wrapper },
  );
}

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

describe('useStepperSelections — a venue offer', () => {
  it("floors the spots at the venue's minimum, up to the space's capacity", () => {
    const { result } = selections(offerValues());
    expect(result.current.offerMinGuests).toBe(8);
    expect(result.current.spots).toEqual({ min: 8, max: 40, slidable: true });
  });

  it('never floors above what the space holds — the server asks for the capacity then', () => {
    const { result } = selections(offerValues({ venue_id: 'venue-2', venue_space_label: 'Studio room', no_of_spots: 6 }));
    expect(result.current.offerMinGuests).toBe(6);
    expect(result.current.spots).toEqual({ min: 6, max: 6, slidable: false });
  });

  it("does not floor a Pod Request's held slot, which was agreed already", () => {
    const { result } = selections(offerValues({ partner_request_id: 'req-1' }));
    expect(result.current.offerMinGuests).toBe(0);
    expect(result.current.spots.min).toBe(0);
  });

  it('does not floor a virtual pod, which books no venue', () => {
    const { result } = selections(offerValues({ pod_mode: 'VIRTUAL' }));
    expect(result.current.offerMinGuests).toBe(0);
  });

  it('feeds the earnings preview the venue money at the spots and at the minimum', async () => {
    const { result } = selections(offerValues(), [quoteMock]);
    await settle();
    await settle();

    expect(result.current.preview.slotPrice).toBe(6600);
    expect(result.current.preview.offerEarnings).toEqual({
      venue_amount: 6000,
      venue_commission_on_top: 600,
      min_spots: 8,
      venue_amount_at_min: 2400,
      venue_commission_on_top_at_min: 240,
    });
  });

  it('sends no offer money for a held slot', () => {
    const { result } = selections(offerValues({ partner_request_id: 'req-1', venue_slot_id: 'slot-1' }));
    expect(result.current.preview.offerEarnings).toBeNull();
    expect(result.current.offerMinGuests).toBe(0);
  });
});
