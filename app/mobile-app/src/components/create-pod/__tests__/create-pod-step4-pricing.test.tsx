import { useForm } from 'react-hook-form';
import { fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';

import { CreatePodStepper } from '@/components/create-pod/CreatePodStepper';
import { PricingStep } from '@/components/create-pod/steps/PricingStep';
import {
  SuggestedPricesModal,
  isVenueShortfall,
  totalPodValue,
  usePodPricing,
} from '@/components/create-pod/price-panel';
import {
  SUGGESTED_PRICE_TIERS,
  tierDescription,
} from '@/components/create-pod/price-panel/step4-copy';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
} from '@/components/create-pod/create-pod.types';
import type { FreePodVenueNotice } from '@duncit/utils';
import { usePotentialEarnings } from '@/hooks/usePotentialEarnings';
import { renderWithProviders } from '@/utils/test-utils';

const mockGraphqlRequest = jest.fn();
jest.mock('@/services/graphql.client', () => ({
  graphqlRequest: (...args: unknown[]) => mockGraphqlRequest(...args),
}));
jest.mock('@/hooks/useFeatureFlag', () => ({ useFeatureFlag: () => false }));
jest.mock('@/hooks/usePotentialEarnings', () => ({ usePotentialEarnings: jest.fn() }));
const mockedEarnings = usePotentialEarnings as jest.Mock;

const finance = { platform_fee_pct: 5, gst_pct: 18, currency_symbol: '₹' };

// A ₹100 × 1 payable spot pod against a ₹400 slot: the venue alone eats more
// than the pod ever collects, so the host takes home less than nothing.
const brokeWaterfall = {
  amount: 100,
  gst_pct: 18,
  gst_amount: 15.25,
  net_amount: 84.75,
  platform_fee_pct: 5,
  platform_fee_amount: 4.24,
  pool_amount: 80.51,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 400,
  venue_commission_pct: 10,
  venue_commission_amount: 40,
  venue_receives: 360,
  host_amount: -319.49,
  host_commission_pct: 10,
  host_commission_amount: -31.95,
  host_receives: -287.54,
  host_earn_pct: -287.54,
};
// The server's verdict on that pod: refused, and the lowest ticket that works.
const refusal = {
  viable: false,
  viability_reason: 'NO_EARNINGS',
  minimum_viable_ticket_price: 620,
  venue_min_business: 0,
};
const brokeProjection = { total_spots: 2, payable_spots: 1, ...refusal, waterfall: brokeWaterfall };
const viableVerdict = {
  viable: true,
  viability_reason: null,
  minimum_viable_ticket_price: 620,
  venue_min_business: 0,
};
const healthy = {
  ...brokeWaterfall,
  venue_amount: 0,
  venue_commission_amount: 0,
  venue_receives: 0,
  host_receives: 60.5,
  host_earn_pct: 60.5,
};
const healthyProjection = {
  total_spots: 2,
  payable_spots: 1,
  ...viableVerdict,
  waterfall: healthy,
};

const ladder = {
  suggestedTicketPrices: [
    { price: 99, host_receives: 40.12 },
    { price: 199, host_receives: 90.5 },
    { price: 299, host_receives: 140.9 },
  ],
};

beforeEach(() => {
  mockGraphqlRequest.mockReset();
  mockGraphqlRequest.mockResolvedValue(ladder);
  mockedEarnings
    .mockReset()
    .mockReturnValue({ projection: null, waterfall: null, isLoading: false });
});

describe('venue-shortfall math', () => {
  it('bills the payable spots only (the host sits free)', () => {
    expect(totalPodValue(1000, 30)).toBe(29000);
  });

  const cases: [string, Parameters<typeof isVenueShortfall>[0], boolean][] = [
    ['virtual pods never pay a slot', shortfallInput({ isPhysical: false }), false],
    ['no slot picked yet', shortfallInput({ slotPrice: null }), false],
    ['a free slot', shortfallInput({ slotPrice: 0 }), false],
    ['a free pod', shortfallInput({ podAmount: 0 }), false],
    ['a host-only pod', shortfallInput({ noOfSpots: 1 }), false],
    ['₹100 × 1 spot against a ₹400 slot', shortfallInput({}), true],
    ['₹500 × 1 spot against a ₹400 slot', shortfallInput({ podAmount: 500 }), false],
  ];
  it.each(cases)('%s → %s', (_label, input, expected) => {
    expect(isVenueShortfall(input)).toBe(expected);
  });
});

function shortfallInput(over: Partial<Parameters<typeof isVenueShortfall>[0]>) {
  return {
    podAmount: 100,
    noOfSpots: 2,
    venueId: 'v1',
    slotPrice: 400,
    isPhysical: true,
    isFree: false,
    ...over,
  };
}

describe('tierDescription', () => {
  it('pairs each ladder rung with its tier line', () => {
    expect(tierDescription(0)).toBe(SUGGESTED_PRICE_TIERS[0]);
    expect(tierDescription(4)).toBe(SUGGESTED_PRICE_TIERS[4]);
  });

  it('degrades to no line past the last tier', () => {
    expect(tierDescription(9)).toBe('');
  });
});

describe('usePodPricing', () => {
  const input = {
    podAmount: 1000,
    noOfSpots: 30,
    venueId: 'v1',
    slotPrice: 300,
    isPhysical: true,
    isFree: false,
  };

  it.each([
    ['BELOW_MIN_BUSINESS', { viability_reason: 'BELOW_MIN_BUSINESS', venue_min_business: 1000 }],
    ['VENUE_NOT_COVERED', { viability_reason: 'VENUE_NOT_COVERED' }],
    ['NO_EARNINGS', { viability_reason: 'NO_EARNINGS' }],
  ])('blocks Create Pod when the fresh verdict refuses the pod (%s)', (_reason, verdict) => {
    mockedEarnings.mockReturnValue({
      projection: { ...brokeProjection, ...verdict },
      waterfall: brokeWaterfall,
      isLoading: false,
      failed: false,
    });
    const { result } = renderHook(() => usePodPricing(input));
    expect(result.current).toMatchObject({ fresh: true, notViable: true, blocked: true });
    expect(result.current.venuePicked).toBe(true);
    expect(result.current.hostOnly).toBe(false);
  });

  it('enables Create Pod only on a fresh projection that says viable', () => {
    mockedEarnings.mockReturnValue({
      projection: healthyProjection,
      waterfall: healthy,
      isLoading: false,
      failed: false,
    });
    const { result } = renderHook(() => usePodPricing(input));
    expect(result.current).toMatchObject({ fresh: true, notViable: false, blocked: false });
    expect(result.current.venueShortfall).toBe(false);
    expect(result.current.ready).toBe(true);
  });

  it('stays blocked while the projection for these inputs is still loading', () => {
    mockedEarnings.mockReturnValue({
      projection: null,
      waterfall: null,
      isLoading: true,
      failed: false,
    });
    const { result } = renderHook(() => usePodPricing(input));
    expect(result.current).toMatchObject({ fresh: false, notViable: false, blocked: true });
  });

  it('stays blocked when the projection request failed, and offers the retry', () => {
    const retry = jest.fn();
    mockedEarnings.mockReturnValue({
      projection: null,
      waterfall: null,
      isLoading: false,
      failed: true,
      retry,
    });
    const { result } = renderHook(() => usePodPricing(input));
    expect(result.current).toMatchObject({ failed: true, fresh: false, blocked: true });
    result.current.retry();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("holds a physical pod until its venue's cost is known, even when a venue-less answer says viable", () => {
    mockedEarnings.mockReturnValue({
      projection: healthyProjection,
      waterfall: healthy,
      isLoading: false,
      failed: false,
    });
    const { result } = renderHook(() => usePodPricing({ ...input, slotPrice: null }));
    expect(result.current).toMatchObject({ venuePicked: false, fresh: false, blocked: true });
  });

  it('judges a virtual pod on its projection alone — it books no venue', () => {
    mockedEarnings.mockReturnValue({
      projection: healthyProjection,
      waterfall: healthy,
      isLoading: false,
      failed: false,
    });
    const { result } = renderHook(() =>
      usePodPricing({ ...input, isPhysical: false, slotPrice: null }),
    );
    expect(result.current).toMatchObject({ fresh: true, blocked: false });
  });

  it('flags the venue row when the pod cannot afford the slot, and still blocks until the server answers', () => {
    const { result } = renderHook(() => usePodPricing(shortfallInput({})));
    expect(result.current.waterfall).toBeNull();
    expect(result.current.venueShortfall).toBe(true);
    expect(result.current.blocked).toBe(true);
  });

  it('drops the venue args until a slot is picked', () => {
    renderHook(() => usePodPricing({ ...input, slotPrice: null }));
    expect(mockedEarnings).toHaveBeenCalledWith(1000, 30, null, null);
  });

  it('prices a held slot by its own price, with no commission on top', () => {
    renderHook(() => usePodPricing(input));
    expect(mockedEarnings).toHaveBeenCalledWith(1000, 30, 'v1', {
      venue_amount: 300,
      venue_commission_on_top: null,
    });
  });

  it('sends an offer’s venue payout and Duncit’s commission on top', () => {
    // The quote total (₹1,239) gates the shortfall; the earnings preview gets
    // what the venue is paid and the commission that comes off the host side.
    const offerEarnings = { venue_amount: 1180, venue_commission_on_top: 59 };
    const { result } = renderHook(() =>
      usePodPricing({ ...input, slotPrice: 1239, offerEarnings }),
    );
    expect(mockedEarnings).toHaveBeenCalledWith(1000, 30, 'v1', offerEarnings);
    expect(result.current.venuePicked).toBe(true);
  });

  it('sends an offer’s money at the venue minimum too, for the earnings range', () => {
    const offerEarnings = {
      venue_amount: 6000,
      venue_commission_on_top: 300,
      min_spots: 10,
      venue_amount_at_min: 3000,
      venue_commission_on_top_at_min: 150,
    };
    renderHook(() => usePodPricing({ ...input, slotPrice: 6300, offerEarnings }));
    expect(mockedEarnings).toHaveBeenCalledWith(1000, 30, 'v1', offerEarnings);
  });

  it('sends no venue money for a pod with no venue booked, even with a stale offer', () => {
    const offerEarnings = { venue_amount: 1180, venue_commission_on_top: 59 };
    renderHook(() => usePodPricing({ ...input, isPhysical: false, offerEarnings }));
    expect(mockedEarnings).toHaveBeenCalledWith(1000, 30, null, null);
  });

  it('marks a 1-spot pod as host-only', () => {
    const { result } = renderHook(() => usePodPricing({ ...input, noOfSpots: 1, slotPrice: null }));
    expect(result.current.hostOnly).toBe(true);
  });

  // The Ticket Price field ships blank, so an untouched paid pod reads as ₹0 —
  // publishing stays blocked until the host types a price of their own.
  it('blocks a paid pod while the ticket price is still blank', () => {
    const { result } = renderHook(() => usePodPricing({ ...input, podAmount: 0 }));
    expect(result.current.priceMissing).toBe(true);
    expect(result.current.blocked).toBe(true);
  });

  it('sends nothing to price for a free pod, even with a stale amount in the form', () => {
    mockedEarnings.mockReturnValue({
      projection: brokeProjection,
      waterfall: brokeWaterfall,
      isLoading: false,
    });
    const { result } = renderHook(() => usePodPricing({ ...input, podAmount: 100, isFree: true }));
    expect(mockedEarnings).toHaveBeenLastCalledWith(0, 30, 'v1', {
      venue_amount: 300,
      venue_commission_on_top: null,
    });
    // No guard can fire on a pod that has no calculation — not even a stale refusal.
    expect(result.current.ready).toBe(false);
    expect(result.current.notViable).toBe(false);
    expect(result.current.venueShortfall).toBe(false);
    expect(result.current.blocked).toBe(false);
  });

  it('exempts a free pod, whose price is legitimately ₹0', () => {
    const { result } = renderHook(() =>
      usePodPricing({ ...input, podAmount: 0, isFree: true, slotPrice: null }),
    );
    expect(result.current.priceMissing).toBe(false);
    expect(result.current.blocked).toBe(false);
  });
});

function PricingHarness({
  initial,
  venueNotice = 'NONE',
  forClubAdmin = false,
}: Readonly<{
  initial: Partial<CreatePodFormValues>;
  venueNotice?: FreePodVenueNotice;
  forClubAdmin?: boolean;
}>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  const pricing = usePodPricing({
    podAmount: Number(form.watch('pod_amount_text')) || 0,
    noOfSpots: Number(form.watch('no_of_spots_text')) || 0,
    venueId: form.watch('venue_id') || null,
    slotPrice: 400,
    isPhysical: form.watch('pod_mode') === 'PHYSICAL',
    isFree: form.watch('pod_type') === 'FREE',
  });
  return (
    <PricingStep
      form={form}
      products={[]}
      showProducts={false}
      finance={finance}
      pricing={pricing}
      venueNotice={venueNotice}
      forClubAdmin={forClubAdmin}
    />
  );
}

/** Money's extras are folded until the host opens them. */
const openMoneyMore = () => fireEvent.press(screen.getByTestId('create-pod-money-more-toggle'));

const paidPod = {
  pod_type: 'PAID' as const,
  pod_mode: 'PHYSICAL' as const,
  venue_id: 'v1',
  pod_amount_text: '100',
  no_of_spots_text: '2',
};

describe('Money verdict notice', () => {
  const refused = (verdict: Record<string, unknown>) =>
    mockedEarnings.mockReturnValue({
      projection: { ...brokeProjection, ...verdict },
      waterfall: brokeWaterfall,
      isLoading: false,
      failed: false,
    });

  it("names the venue's minimum business and the lowest ticket price under the price field", () => {
    refused({
      viability_reason: 'BELOW_MIN_BUSINESS',
      minimum_viable_ticket_price: 1112,
      venue_min_business: 1000,
    });
    renderWithProviders(<PricingHarness initial={paidPod} />);
    const box = screen.getByTestId('create-pod-viability-notice');
    expect(box).toHaveTextContent(/Below the venue's minimum business/);
    expect(box).toHaveTextContent(/This venue's minimum business is ₹1,000\.00\./);
    expect(box).toHaveTextContent(/Set the ticket price to at least ₹1,112\.00, or add spots\./);
  });

  it('names the lowest ticket price when the venue is not covered', () => {
    refused({ viability_reason: 'VENUE_NOT_COVERED', minimum_viable_ticket_price: 450 });
    renderWithProviders(<PricingHarness initial={paidPod} />);
    const box = screen.getByTestId('create-pod-viability-notice');
    expect(box).toHaveTextContent(/The pod does not cover the venue/);
    expect(box).toHaveTextContent(/Set the ticket price to at least ₹450\.00\./);
  });

  it('explains a ₹0 payout, with the lowest price that earns something', () => {
    refused({ viability_reason: 'NO_EARNINGS', minimum_viable_ticket_price: 620 });
    renderWithProviders(<PricingHarness initial={paidPod} />);
    const box = screen.getByTestId('create-pod-viability-notice');
    expect(box).toHaveTextContent(/No Earnings Generated/);
    expect(box).toHaveTextContent(/Set it to at least ₹620\.00 to earn from this pod\./);
  });

  it('keeps the ₹0 copy when no ticket price earns anything', () => {
    refused({ viability_reason: 'NO_EARNINGS', minimum_viable_ticket_price: null });
    renderWithProviders(<PricingHarness initial={paidPod} />);
    expect(screen.getByTestId('create-pod-viability-notice')).toHaveTextContent(
      /Please increase the Ticket Price to earn from this Pod\./,
    );
  });

  it('says the check failed, with a retry, when the projection could not be fetched', () => {
    const retry = jest.fn();
    mockedEarnings.mockReturnValue({
      projection: null,
      waterfall: null,
      isLoading: false,
      failed: true,
      retry,
    });
    renderWithProviders(<PricingHarness initial={paidPod} />);
    expect(screen.getByTestId('create-pod-viability-failed')).toHaveTextContent(
      /We couldn't check your earnings for this price\./,
    );
    fireEvent.press(screen.getByTestId('create-pod-viability-retry'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('clears itself as soon as the verdict says viable — the live region stays mounted', () => {
    mockedEarnings.mockReturnValue({
      projection: healthyProjection,
      waterfall: healthy,
      isLoading: false,
      failed: false,
    });
    renderWithProviders(<PricingHarness initial={paidPod} />);
    expect(screen.queryByTestId('create-pod-viability-notice')).toBeNull();
    expect(screen.queryByTestId('create-pod-viability-failed')).toBeNull();
    expect(screen.getByTestId('create-pod-viability')).toHaveProp('aria-live', 'polite');
  });
});

describe('Money venue-price guard', () => {
  it('turns Venue Charges red and says why the pod cannot cover the slot', () => {
    mockedEarnings.mockReturnValue({
      projection: brokeProjection,
      waterfall: brokeWaterfall,
      isLoading: false,
    });
    renderWithProviders(<PricingHarness initial={paidPod} />);
    expect(screen.getByTestId('price-panel-venue-group-invalid')).toHaveTextContent(
      /Your venue price is greater than the total Pod value\./,
    );
  });

  it('leaves the section neutral when the pod covers the slot', () => {
    mockedEarnings.mockReturnValue({
      projection: brokeProjection,
      waterfall: brokeWaterfall,
      isLoading: false,
    });
    renderWithProviders(<PricingHarness initial={{ ...paidPod, pod_amount_text: '900' }} />);
    expect(screen.queryByTestId('price-panel-venue-group-invalid')).toBeNull();
  });
});

describe('Money for a free physical pod', () => {
  const freePod = { ...paidPod, pod_type: 'FREE' as const, pod_amount_text: '0' };

  it('shows no amount, no suggested prices and no earnings — only the free note', () => {
    mockedEarnings.mockReturnValue({ projection: null, waterfall: null, isLoading: false });
    renderWithProviders(<PricingHarness initial={freePod} />);
    expect(screen.queryByTestId('field-pod_amount_text')).toBeNull();
    expect(screen.queryByTestId('suggested-price-link')).toBeNull();
    expect(screen.queryByTestId('create-pod-price-panel')).toBeNull();
    // A free pod has no verdict to wait on, so the notice region is not drawn at all.
    expect(screen.queryByTestId('create-pod-viability')).toBeNull();
    expect(screen.getByTestId('create-pod-free-note-header-title')).toHaveTextContent(
      'This pod is free',
    );
    expect(screen.getByTestId('create-pod-free-note-header-title')).toHaveProp('role', 'heading');
    expect(screen.queryByTestId('create-pod-free-note-venue')).toBeNull();
    // Payment terms describe refunds and charges a free pod does not have; a
    // physical pod still lists its place charges among the extras.
    openMoneyMore();
    expect(screen.getByTestId('pricing-step-place-charges-card')).toBeOnTheScreen();
    expect(screen.queryByTestId('pricing-step-payment-terms-card')).toBeNull();
  });

  it('asks why the pod is free under the ticket when no free venue offer asks it', () => {
    renderWithProviders(<PricingHarness initial={freePod} />);
    expect(screen.getByTestId('create-pod-pod-free-arrangement')).toBeOnTheScreen();
  });

  it('offers only the Free ticket, already picked, when the host asks the venue for it free', async () => {
    renderWithProviders(<PricingHarness initial={{ ...paidPod, venue_offer_model: 'FREE' }} />);
    expect(await screen.findByTestId('create-pod-free-venue-ticket')).toHaveTextContent(
      'Your venue booking is free, so this pod is free too. Free is the only ticket.',
    );
    await waitFor(() =>
      expect(screen.getByTestId('create-pod-free')).toHaveProp('aria-checked', true),
    );
    expect(screen.queryByTestId('create-pod-paid')).toBeNull();
    // No price to type, and no earnings: the free note stands in their place.
    expect(screen.queryByTestId('field-pod_amount_text')).toBeNull();
  });

  it('keeps both tickets for a priced offer, or a held slot whatever model a draft holds', () => {
    for (const initial of [
      { ...paidPod, venue_offer_model: 'FLAT' },
      { ...paidPod, venue_slot_id: 'slot-1', venue_offer_model: 'FREE' },
    ]) {
      const view = renderWithProviders(<PricingHarness initial={initial} />);
      expect(screen.getByTestId('create-pod-paid')).toHaveProp('aria-checked', true);
      expect(screen.queryByTestId('create-pod-free-venue-ticket')).toBeNull();
      view.unmount();
    }
  });

  it('leaves the question to the free venue offer above, which already asks it', () => {
    renderWithProviders(<PricingHarness initial={{ ...freePod, venue_offer_model: 'FREE' }} />);
    expect(screen.queryByTestId('create-pod-pod-free-arrangement')).toBeNull();
  });

  it('asks it under the ticket for a held slot, which sends no offer whatever model a draft holds', () => {
    renderWithProviders(
      <PricingHarness
        initial={{ ...freePod, venue_slot_id: 'slot-1', venue_offer_model: 'FREE' }}
      />,
    );
    expect(screen.getByTestId('create-pod-pod-free-arrangement')).toBeOnTheScreen();
  });

  it('words the venue note for the host when a club admin creates the pod', () => {
    mockedEarnings.mockReturnValue({ projection: null, waterfall: null, isLoading: false });
    renderWithProviders(<PricingHarness initial={freePod} venueNotice="SETTLE" forClubAdmin />);
    const note = screen.getByTestId('create-pod-free-note-venue');
    expect(note).toHaveTextContent(/The host will need to settle the venue's charges/);
    expect(note).not.toHaveTextContent(/You will need/);
    expect(note).not.toHaveTextContent(/asked not to confirm the slot/);
  });

  it('tells the host to settle a priced booking with the venue, with no approval line (bookings are instant)', () => {
    mockedEarnings.mockReturnValue({ projection: null, waterfall: null, isLoading: false });
    renderWithProviders(<PricingHarness initial={freePod} venueNotice="SETTLE" />);
    const note = screen.getByTestId('create-pod-free-note-venue');
    expect(note).toHaveTextContent(/Duncit will not pay the venue/);
    expect(note).not.toHaveTextContent(/asked not to confirm the slot/);
  });

  it('keeps the paid pod as it was: amount, suggested prices and the earnings panel', () => {
    mockedEarnings.mockReturnValue({
      projection: brokeProjection,
      waterfall: healthy,
      isLoading: false,
    });
    renderWithProviders(<PricingHarness initial={paidPod} venueNotice="SETTLE" />);
    expect(screen.getByTestId('field-pod_amount_text')).toHaveProp('value', '100');
    expect(screen.getByTestId('suggested-price-link')).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-price-panel')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-free-note')).toBeNull();
    expect(screen.queryByTestId('create-pod-pod-free-arrangement')).toBeNull();
    openMoneyMore();
    expect(screen.getByTestId('pricing-step-payment-terms-card')).toBeOnTheScreen();
  });
});

describe('Money more options', () => {
  it('folds the extras until the host opens them', () => {
    renderWithProviders(<PricingHarness initial={paidPod} />);
    expect(screen.getByTestId('create-pod-money-more-toggle')).toHaveProp('aria-expanded', false);
    expect(screen.queryByTestId('pricing-step-payment-terms-card')).toBeNull();
    openMoneyMore();
    expect(screen.getByTestId('create-pod-money-more-toggle')).toHaveProp('aria-expanded', true);
    expect(screen.getByTestId('pricing-step-place-charges-card')).toBeOnTheScreen();
  });

  it('opens on arrival when an extra is already filled', () => {
    renderWithProviders(<PricingHarness initial={{ ...paidPod, payment_terms: 'No refunds' }} />);
    expect(screen.getByTestId('create-pod-money-more-toggle')).toHaveProp('aria-expanded', true);
    expect(screen.getByTestId('pricing-step-payment-terms-card')).toBeOnTheScreen();
  });

  it('has nothing to offer a free virtual pod without products', () => {
    renderWithProviders(
      <PricingHarness
        initial={{ ...paidPod, pod_mode: 'VIRTUAL', pod_type: 'FREE', pod_amount_text: '0' }}
      />,
    );
    expect(screen.queryByTestId('create-pod-money-more')).toBeNull();
  });
});

describe('Suggested Ticket Prices', () => {
  it('opens from the link beside the label and closes on the ✕', async () => {
    renderWithProviders(<PricingHarness initial={paidPod} />);
    expect(screen.queryByTestId('suggested-prices-table')).toBeNull();
    fireEvent.press(screen.getByTestId('suggested-price-link'));
    await screen.findByTestId('suggested-prices-table');
    fireEvent.press(screen.getByTestId('suggested-prices-close'));
    await waitFor(() => expect(screen.queryByTestId('suggested-prices-table')).toBeNull());
  });

  it('closes on a backdrop tap (click-outside)', async () => {
    renderWithProviders(<PricingHarness initial={paidPod} />);
    fireEvent.press(screen.getByTestId('suggested-price-link'));
    await screen.findByTestId('suggested-prices-table');
    fireEvent.press(screen.getByTestId('suggested-prices-backdrop'));
    await waitFor(() => expect(screen.queryByTestId('suggested-prices-table')).toBeNull());
  });

  it('lists every rung with its tier line and opens the top of the ladder', async () => {
    renderWithProviders(
      <SuggestedPricesModal
        open
        onClose={jest.fn()}
        noOfSpots={30}
        venueId="v1"
        venueAmount={400}
        symbol="₹"
      />,
    );
    await screen.findByTestId('suggested-price-99');
    expect(screen.getByText('Suggested Price')).toBeOnTheScreen();
    expect(screen.getByText('What You Get')).toBeOnTheScreen();
    const first = screen.getByTestId('suggested-price-99');
    expect(first).toHaveTextContent(/₹99/);
    expect(first).toHaveTextContent(/Most affordable/);
    expect(first).toHaveTextContent(/₹40/);
    expect(screen.getByTestId('suggested-price-199')).toHaveTextContent(/₹91/);
    // The last rung is the open end of the ladder.
    expect(screen.getByTestId('suggested-price-299')).toHaveTextContent(/₹299\+/);
    expect(screen.getByTestId('suggested-prices-note')).toHaveTextContent(
      /maximize both participation and revenue/,
    );
  });

  it('shows the spinner while the ladder loads', () => {
    mockGraphqlRequest.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(
      <SuggestedPricesModal
        open
        onClose={jest.fn()}
        noOfSpots={30}
        venueId={null}
        venueAmount={null}
        symbol="₹"
      />,
    );
    expect(screen.getByTestId('suggested-prices-loading')).toBeOnTheScreen();
  });

  it('surfaces a failed load', async () => {
    mockGraphqlRequest.mockRejectedValue(new Error('down'));
    renderWithProviders(
      <SuggestedPricesModal
        open
        onClose={jest.fn()}
        noOfSpots={30}
        venueId={null}
        venueAmount={null}
        symbol="₹"
      />,
    );
    expect(await screen.findByTestId('suggested-prices-error')).toBeOnTheScreen();
  });

  it('asks for the pod size before it can suggest anything', () => {
    renderWithProviders(
      <SuggestedPricesModal
        open
        onClose={jest.fn()}
        noOfSpots={1}
        venueId={null}
        venueAmount={null}
        symbol="₹"
      />,
    );
    expect(mockGraphqlRequest).not.toHaveBeenCalled();
    expect(screen.getByTestId('suggested-prices-empty')).toBeOnTheScreen();
  });
});

describe('Money products — category empty state', () => {
  // `products` reaches this step already filtered to the pod's club category
  // (CreatePodStepper -> filterProductsForClub), so an empty list means the
  // category has nothing to attach — not that the catalogue is empty.
  const renderProducts = (products: unknown[]) => {
    const { result } = renderHook(() =>
      useForm<CreatePodFormValues, any, CreatePodFormValues>({
        defaultValues: { ...blankCreatePodForm, ...paidPod, products_enabled: true },
      }),
    );
    const view = renderWithProviders(
      <PricingStep
        form={result.current}
        products={products as never}
        showProducts
        finance={finance}
        pricing={
          {
            podAmount: 0,
            noOfSpots: 0,
            payableSpots: 0,
            slotPrice: 0,
            venueTotal: 0,
            isVenueShortfall: false,
          } as never
        }
        venueNotice="NONE"
      />,
    );
    // No product is attached yet, so the extras arrive folded.
    openMoneyMore();
    return view;
  };

  it('tells the host when the pod category has no attachable products', () => {
    mockedEarnings.mockReturnValue({ projection: null, waterfall: null, isLoading: false });
    renderProducts([]);
    expect(screen.getByTestId('pricing-step-products-card')).toBeOnTheScreen();
    expect(screen.getByTestId('products-empty-category')).toHaveTextContent(
      'No products available for this category.',
    );
    // With nothing to pick, the add button stays shut.
    expect(screen.getByTestId('product-add')).toHaveProp('aria-disabled', true);
  });

  it('shows no category empty state once the category has products', () => {
    mockedEarnings.mockReturnValue({ projection: null, waterfall: null, isLoading: false });
    renderProducts([{ id: 'p1', product_name: 'Shuttle', unit_cost: 100, available_count: 5 }]);
    expect(screen.queryByTestId('products-empty-category')).toBeNull();
    expect(screen.getByTestId('product-add')).toHaveProp('aria-disabled', false);
    // Nothing is attached yet, which is its own (separate) hint.
    expect(screen.getByTestId('products-empty')).toHaveTextContent('No products attached yet.');
  });
});

describe('Create Pod button gating', () => {
  const setup = (over: Partial<CreatePodFormValues> = {}) =>
    renderWithProviders(
      <CreatePodStepper
        initialValues={{ ...blankCreatePodForm, ...paidPod, ...over }}
        // Details, the last step — Money's guard holds Create Pod there.
        initialStep={3}
        initialDraftId={null}
        clubs={[]}
        locations={[]}
        venues={[]}
        products={[]}
        subCategories={[]}
        hostCategories={[]}
        viewerUserId="me-1"
        finance={finance}
        onSaveDraft={jest.fn().mockResolvedValue('draft-1')}
        onModerate={jest.fn().mockResolvedValue({ allowed: true, violations: [] })}
        onPublish={jest.fn().mockResolvedValue(undefined)}
      />,
    );

  // A virtual pod books no venue, so the server's verdict alone decides.
  const virtual = { pod_mode: 'VIRTUAL' as const };

  it('disables Create Pod while the verdict refuses the pod', async () => {
    mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [] });
    mockedEarnings.mockReturnValue({
      projection: brokeProjection,
      waterfall: brokeWaterfall,
      isLoading: false,
      failed: false,
    });
    setup(virtual);
    await screen.findByTestId('create-pod-details-step');
    expect(screen.getByTestId('create-pod-submit')).toBeDisabled();
  });

  it.each([
    ['still loading', { isLoading: true, failed: false }],
    ['failed', { isLoading: false, failed: true }],
  ])('disables Create Pod while the projection is %s', async (_state, flags) => {
    mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [] });
    mockedEarnings.mockReturnValue({ projection: null, waterfall: null, ...flags });
    setup(virtual);
    await screen.findByTestId('create-pod-details-step');
    expect(screen.getByTestId('create-pod-submit')).toBeDisabled();
  });

  it('enables Create Pod once a fresh verdict says viable', async () => {
    mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [] });
    mockedEarnings.mockReturnValue({
      projection: healthyProjection,
      waterfall: healthy,
      isLoading: false,
      failed: false,
    });
    setup(virtual);
    await screen.findByTestId('create-pod-details-step');
    expect(screen.getByTestId('create-pod-submit')).not.toBeDisabled();
  });

  it('keeps Create Pod off for a physical pod whose venue is not priced yet, whatever the verdict says', async () => {
    mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [] });
    mockedEarnings.mockReturnValue({
      projection: healthyProjection,
      waterfall: healthy,
      isLoading: false,
      failed: false,
    });
    setup();
    await screen.findByTestId('create-pod-details-step');
    expect(screen.getByTestId('create-pod-submit')).toBeDisabled();
  });

  it('never holds back a free pod', async () => {
    mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [] });
    setup({ ...virtual, pod_type: 'FREE', pod_amount_text: '0' });
    await screen.findByTestId('create-pod-details-step');
    expect(screen.getByTestId('create-pod-submit')).not.toBeDisabled();
  });
});
