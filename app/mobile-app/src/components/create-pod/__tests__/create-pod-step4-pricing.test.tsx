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
const brokeProjection = { total_spots: 2, payable_spots: 1, waterfall: brokeWaterfall };
const healthy = {
  ...brokeWaterfall,
  venue_amount: 0,
  venue_commission_amount: 0,
  venue_receives: 0,
  host_receives: 60.5,
  host_earn_pct: 60.5,
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

  it('blocks Create Pod when the projected payout is ₹0 or less', () => {
    mockedEarnings.mockReturnValue({
      projection: brokeProjection,
      waterfall: { ...brokeWaterfall, host_receives: 0 },
      isLoading: false,
    });
    const { result } = renderHook(() => usePodPricing(input));
    expect(result.current.zeroEarnings).toBe(true);
    expect(result.current.blocked).toBe(true);
    expect(result.current.venuePicked).toBe(true);
    expect(result.current.hostOnly).toBe(false);
  });

  it('never claims ₹0 earnings from a waterfall a newer price superseded', () => {
    mockedEarnings.mockReturnValue({
      projection: brokeProjection,
      waterfall: brokeWaterfall,
      isLoading: true,
    });
    const { result } = renderHook(() => usePodPricing(input));
    expect(result.current.zeroEarnings).toBe(false);
    expect(result.current.blocked).toBe(false);
  });

  it('clears both guards once the price earns something', () => {
    mockedEarnings.mockReturnValue({
      projection: brokeProjection,
      waterfall: healthy,
      isLoading: false,
    });
    const { result } = renderHook(() => usePodPricing(input));
    expect(result.current.zeroEarnings).toBe(false);
    expect(result.current.venueShortfall).toBe(false);
    expect(result.current.blocked).toBe(false);
    expect(result.current.ready).toBe(true);
  });

  it('blocks on a venue the pod cannot afford before the server even answers', () => {
    const { result } = renderHook(() => usePodPricing(shortfallInput({})));
    expect(result.current.waterfall).toBeNull();
    expect(result.current.venueShortfall).toBe(true);
    expect(result.current.blocked).toBe(true);
  });

  it('drops the venue args until a slot is picked', () => {
    renderHook(() => usePodPricing({ ...input, slotPrice: null }));
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

  it('exempts a free pod, whose price is legitimately ₹0', () => {
    const { result } = renderHook(() =>
      usePodPricing({ ...input, podAmount: 0, isFree: true, slotPrice: null }),
    );
    expect(result.current.priceMissing).toBe(false);
    expect(result.current.blocked).toBe(false);
  });
});

function PricingHarness({ initial }: Readonly<{ initial: Partial<CreatePodFormValues> }>) {
  const form = useForm<CreatePodFormValues>({
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
      spots={{ min: 0, max: 10000, slidable: false }}
    />
  );
}

const paidPod = {
  pod_type: 'PAID' as const,
  pod_mode: 'PHYSICAL' as const,
  venue_id: 'v1',
  pod_amount_text: '100',
  no_of_spots_text: '2',
};

describe('Step 4 zero-earnings guard', () => {
  it('explains a ₹0 payout under the ticket price field', () => {
    mockedEarnings.mockReturnValue({
      projection: brokeProjection,
      waterfall: brokeWaterfall,
      isLoading: false,
    });
    renderWithProviders(<PricingHarness initial={paidPod} />);
    const box = screen.getByTestId('create-pod-zero-earnings');
    expect(box).toHaveTextContent(/No Earnings Generated/);
    expect(box).toHaveTextContent(/Please increase the Ticket Price to earn from this Pod\./);
  });

  it('clears itself as soon as the price earns something', () => {
    mockedEarnings.mockReturnValue({
      projection: brokeProjection,
      waterfall: healthy,
      isLoading: false,
    });
    renderWithProviders(<PricingHarness initial={paidPod} />);
    expect(screen.queryByTestId('create-pod-zero-earnings')).toBeNull();
  });
});

describe('Step 4 venue-price guard', () => {
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

describe('Step 4 products — category empty state', () => {
  // `products` reaches this step already filtered to the pod's club category
  // (CreatePodStepper -> filterProductsForClub), so an empty list means the
  // category has nothing to attach — not that the catalogue is empty.
  const renderProducts = (products: unknown[]) => {
    const { result } = renderHook(() =>
      useForm<CreatePodFormValues>({
        defaultValues: { ...blankCreatePodForm, ...paidPod, products_enabled: true },
      }),
    );
    return renderWithProviders(
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
        spots={{ min: 0, max: 10000, slidable: false }}
      />,
    );
  };

  it('tells the host when the pod category has no attachable products', () => {
    mockedEarnings.mockReturnValue({ projection: null, waterfall: null, isLoading: false });
    renderProducts([]);
    expect(screen.getByTestId('products-empty')).toHaveTextContent(
      'No products available for this category.',
    );
  });

  it('shows no empty state once the category has products', () => {
    mockedEarnings.mockReturnValue({ projection: null, waterfall: null, isLoading: false });
    renderProducts([{ id: 'p1', product_name: 'Shuttle', unit_cost: 100, available_count: 5 }]);
    expect(screen.queryByTestId('products-empty')).toBeNull();
  });
});

describe('Create Pod button gating', () => {
  const setup = () =>
    renderWithProviders(
      <CreatePodStepper
        initialValues={{ ...blankCreatePodForm, ...paidPod }}
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

  it('disables Create Pod while a guard is tripped', async () => {
    mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [] });
    mockedEarnings.mockReturnValue({
      projection: brokeProjection,
      waterfall: brokeWaterfall,
      isLoading: false,
    });
    setup();
    await screen.findByTestId('create-pod-price-panel');
    expect(screen.getByTestId('create-pod-submit')).toBeDisabled();
  });

  it('enables Create Pod once the pod earns something', async () => {
    mockGraphqlRequest.mockResolvedValue({ venueAvailableSlots: [] });
    mockedEarnings.mockReturnValue({
      projection: brokeProjection,
      waterfall: healthy,
      isLoading: false,
    });
    setup();
    await screen.findByTestId('create-pod-price-panel');
    expect(screen.getByTestId('create-pod-submit')).not.toBeDisabled();
  });
});
