import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseFormReturn } from 'react-hook-form';
import PaymentSection from '../../src/sections/PaymentSection';
import EarningsProjection from '../../src/components/EarningsProjection';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormData, PodFormValues } from '../../src/types';

// The spots field reads the activity minimum and the booked space's capacity,
// both from cache-first queries the form already issues. Default: neither is
// set, so the field stays the plain number input it has always been.
const apollo = vi.hoisted(() => ({
  data: undefined as unknown,
}));
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({ data: apollo.data, loading: false, error: undefined }),
}));

const FINANCE = { platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹' };

// The server's waterfall for ₹500 × 9 payable spots at today's default rates —
// the projection renders these figures, it never re-derives them client-side.
const WATERFALL = {
  amount: 4500,
  gst_pct: 18,
  gst_amount: 686.44,
  net_amount: 3813.56,
  platform_fee_pct: 10,
  platform_fee_amount: 381.36,
  pool_amount: 3432.2,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 0,
  venue_commission_pct: 0,
  venue_commission_amount: 0,
  venue_receives: 0,
  host_amount: 3432.2,
  host_commission_pct: 5,
  host_commission_amount: 171.61,
  host_receives: 3260.59,
  host_earn_pct: 72.5,
};
const PROJECTION = {
  adminPotentialPodEarnings: {
    total_spots: 10,
    payable_spots: 9,
    venue_budget: 3260,
    waterfall: WATERFALL,
  },
};

afterEach(() => {
  apollo.data = undefined;
});

function renderPayment(data: PodFormData, defaults: Partial<PodFormValues> = {}) {
  const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
  render(
    <Harness data={data} defaultValues={defaults} methodsRef={methodsRef}>
      <PaymentSection />
    </Harness>,
  );
  return methodsRef;
}

/** The projection on its own — PaymentSection only mounts it once a price is
 * typed, so an empty box is only reachable from here. */
function renderProjection(defaults: Partial<PodFormValues> = {}) {
  render(
    <Harness data={makeData({ config: makeConfig({ showFinance: true }), finance: FINANCE })} defaultValues={defaults}>
      <EarningsProjection productCost={0} />
    </Harness>,
  );
}

describe('EarningsProjection on its own', () => {
  it('asks for a price rather than projecting one when the amount is not a number', () => {
    apollo.data = { categories: [], venueAvailableSlots: [], ...PROJECTION };
    renderProjection({ pod_type: 'NATIVE_PAID', pod_amount: '' as unknown as number, no_of_spots: 10 });

    expect(screen.getByText(/Enter a ticket price and at least 2 spots/)).toBeInTheDocument();
  });

  it('asks for a price when the spots box is empty too', () => {
    apollo.data = { categories: [], venueAvailableSlots: [], ...PROJECTION };
    renderProjection({ pod_type: 'NATIVE_PAID', pod_amount: 500, no_of_spots: '' as unknown as number });

    expect(screen.getByText(/Enter a ticket price and at least 2 spots/)).toBeInTheDocument();
  });
});

describe('PaymentSection', () => {
  it('changes the pod type and zeroes the amount for a free type', async () => {
    const user = userEvent.setup();
    const ref = renderPayment(makeData(), { pod_type: 'NATIVE_PAID', pod_amount: 500 });
    await user.click(screen.getByLabelText(/Pod type/));
    await user.click(await screen.findByRole('option', { name: 'Native · Free' }));
    expect(ref.current?.getValues('pod_type')).toBe('NATIVE_FREE');
    expect(ref.current?.getValues('pod_amount')).toBe(0);
  });

  it('changes the occurrence', async () => {
    const user = userEvent.setup();
    const ref = renderPayment(makeData());
    await user.click(screen.getByLabelText(/Occurrence/));
    await user.click(await screen.findByRole('option', { name: 'Weekly' }));
    expect(ref.current?.getValues('pod_occurrence')).toBe('WEEKLY');
  });

  it('edits the amount and spots for a paid pod', async () => {
    const user = userEvent.setup();
    const ref = renderPayment(makeData(), { pod_type: 'NATIVE_PAID' });
    const amount = screen.getByLabelText(/Amount/);
    await user.clear(amount);
    await user.type(amount, '750');
    const spots = screen.getByLabelText(/No. of spots/);
    await user.clear(spots);
    await user.type(spots, '30');
    expect(ref.current?.getValues('pod_amount')).toBe(750);
    expect(ref.current?.getValues('no_of_spots')).toBe(30);
  });

  it('disables the amount for a free pod', () => {
    renderPayment(makeData(), { pod_type: 'NATIVE_FREE' });
    expect(screen.getByLabelText(/Amount/)).toBeDisabled();
  });

  it('coerces non-numeric amount and spots to zero', async () => {
    const user = userEvent.setup();
    const ref = renderPayment(makeData(), { pod_type: 'NATIVE_PAID', pod_amount: 5, no_of_spots: 5 });
    await user.clear(screen.getByLabelText(/Amount/));
    await user.clear(screen.getByLabelText(/No. of spots/));
    expect(ref.current?.getValues('pod_amount')).toBe(0);
    expect(ref.current?.getValues('no_of_spots')).toBe(0);
  });

  it('shows the finance breakdown for a paid pod when finance is enabled', () => {
    const data = makeData({ config: makeConfig({ showFinance: true, showInventory: true }), finance: FINANCE });
    renderPayment(data, { pod_type: 'NATIVE_PAID', pod_amount: 500, products_enabled: false });
    expect(screen.getByText('Earnings projection')).toBeInTheDocument();
  });

  // Priced off the ROWS: the "Attach products" switch is gone, so a false
  // products_enabled must not zero the breakdown while rows are attached.
  it('feeds product cost into the breakdown when inventory + products are on', () => {
    apollo.data = { categories: [], venueAvailableSlots: [], ...PROJECTION };
    const data = makeData({
      config: makeConfig({ showFinance: true, showInventory: true }),
      finance: FINANCE,
      products: [{ id: 'p1', unit_cost: 100 }],
    });
    renderPayment(data, {
      pod_type: 'NATIVE_PAID',
      pod_amount: 500,
      no_of_spots: 10,
      products_enabled: false,
      product_requests: [{ product_id: 'p1', quantity: 2 }],
    });
    expect(screen.getByText('Duncit product cost')).toBeInTheDocument();
    // 2 × ₹100 as a deduction, and the payout drops by it: 3260.59 − 200.
    expect(screen.getByText('− ₹200.00')).toBeInTheDocument();
    expect(screen.getByText('₹3,060.59')).toBeInTheDocument();
  });

  it('leaves the product row out of the breakdown when nothing is attached', () => {
    apollo.data = { categories: [], venueAvailableSlots: [], ...PROJECTION };
    const data = makeData({
      config: makeConfig({ showFinance: true, showInventory: true }),
      finance: FINANCE,
      products: [{ id: 'p1', unit_cost: 100 }],
    });
    renderPayment(data, { pod_type: 'NATIVE_PAID', pod_amount: 500, no_of_spots: 10 });
    expect(screen.queryByText('Duncit product cost')).not.toBeInTheDocument();
    expect(screen.getByText('₹3,260.59')).toBeInTheDocument();
  });

  it('hides the breakdown for a free pod even with finance enabled', () => {
    const data = makeData({ config: makeConfig({ showFinance: true }), finance: FINANCE });
    renderPayment(data, { pod_type: 'NATIVE_FREE', pod_amount: 0 });
    expect(screen.queryByText('Earnings projection')).not.toBeInTheDocument();
  });

  it('toggles the active switch while editing when the flag is on', async () => {
    const user = userEvent.setup();
    const data = makeData({ config: makeConfig({ showIsActive: true }) });
    const ref = renderPayment(data, { pod_id: 'pod-1', is_active: true });
    expect(screen.getByText('Active')).toBeInTheDocument();
    await user.click(screen.getByRole('switch'));
    expect(ref.current?.getValues('is_active')).toBe(false);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('hides the active switch when creating a new pod', () => {
    const data = makeData({ config: makeConfig({ showIsActive: true }) });
    renderPayment(data, { pod_id: '' });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('renders the place charges editor for a physical pod', () => {
    const data = makeData({ config: makeConfig({ showPlaceCharges: true }) });
    renderPayment(data, { pod_mode: 'PHYSICAL' });
    expect(screen.getByText('Place charges')).toBeInTheDocument();
  });

  it('hides place charges for a virtual pod', () => {
    const data = makeData({ config: makeConfig({ showPlaceCharges: true }) });
    renderPayment(data, { pod_mode: 'VIRTUAL' });
    expect(screen.queryByText('Place charges')).not.toBeInTheDocument();
  });

  it('projects while the server waterfall has not answered yet', () => {
    apollo.data = { categories: [], venueAvailableSlots: [] };
    const data = makeData({ config: makeConfig({ showFinance: true }), finance: FINANCE });
    renderPayment(data, { pod_type: 'NATIVE_PAID', pod_amount: 500, no_of_spots: 10 });
    expect(screen.getByText('Projecting…')).toBeInTheDocument();
  });

  it('treats a projection behind the typed inputs as loading, never a mismatched answer', () => {
    apollo.data = { categories: [], venueAvailableSlots: [], ...PROJECTION };
    const data = makeData({ config: makeConfig({ showFinance: true }), finance: FINANCE });
    const ref = renderPayment(data, { pod_type: 'NATIVE_PAID', pod_amount: 500, no_of_spots: 10 });
    expect(screen.getByText('Total collection')).toBeInTheDocument();
    // The typed price moves on; the debounced query value has not yet.
    act(() => {
      ref.current?.setValue('pod_amount', 600);
    });
    expect(screen.getByText('Projecting…')).toBeInTheDocument();
    expect(screen.queryByText('Total collection')).not.toBeInTheDocument();
  });

  it('warns that the save will be refused when products eat the whole payout', () => {
    apollo.data = { categories: [], venueAvailableSlots: [], ...PROJECTION };
    const data = makeData({
      config: makeConfig({ showFinance: true, showInventory: true }),
      finance: FINANCE,
      products: [{ id: 'p1', unit_cost: 2000 }],
    });
    renderPayment(data, {
      pod_type: 'NATIVE_PAID',
      pod_amount: 500,
      no_of_spots: 10,
      product_requests: [{ product_id: 'p1', quantity: 2 }],
    });
    expect(screen.getByTestId('earnings-zero')).toBeInTheDocument();
  });

  it('prices the projection against the booked slot once one is picked', () => {
    apollo.data = { categories: [], venueAvailableSlots: [], ...PROJECTION };
    const data = makeData({ config: makeConfig({ showFinance: true }), finance: FINANCE });
    renderPayment(data, {
      pod_type: 'NATIVE_PAID',
      pod_amount: 500,
      no_of_spots: 10,
      pod_mode: 'PHYSICAL',
      venue_id: 'v1',
      venue_slot_id: 's1',
    });
    // The slot price is a real statement line now, not a "pick a venue" prompt.
    expect(screen.getByText('Venue Slot Price')).toBeInTheDocument();
    expect(screen.getByText('Host receives')).toBeInTheDocument();
    expect(screen.queryByText(/Pick a venue slot/)).not.toBeInTheDocument();
    expect(screen.getByTestId('earnings-venue-budget')).toBeInTheDocument();
  });

  it('shows no venue budget for a virtual pod, which has no venue at all', () => {
    apollo.data = { categories: [], venueAvailableSlots: [], ...PROJECTION };
    const data = makeData({ config: makeConfig({ showFinance: true }), finance: FINANCE });
    renderPayment(data, {
      pod_type: 'NATIVE_PAID',
      pod_amount: 500,
      no_of_spots: 10,
      pod_mode: 'VIRTUAL',
    });
    expect(screen.queryByTestId('earnings-venue-budget')).not.toBeInTheDocument();
    expect(screen.queryByText('Venue Slot Price')).not.toBeInTheDocument();
  });

  it('shows amount and spot validation errors', () => {
    const ref = renderPayment(makeData(), { pod_type: 'NATIVE_PAID' });
    act(() => {
      ref.current?.setError('pod_amount', { type: 'custom', message: 'Amount cannot exceed 1999' });
      ref.current?.setError('no_of_spots', { type: 'custom', message: 'Spots must be a number' });
    });
    expect(screen.getByText('Amount cannot exceed 1999')).toBeInTheDocument();
    expect(screen.getByText('Spots must be a number')).toBeInTheDocument();
  });
});

// The spots control: floored by the sub-category's admin-set minimum, capped by
// the capacity of the venue space the pod books. A slider only when both ends
// are real — a 0–10,000 drag would be useless.
describe('PaymentSection — spots bounds', () => {
  const BADMINTON_CLUB = { id: 'c1', club_name: 'Badminton', category_id: 'sub-badminton' };
  const CATEGORIES = [
    { id: 'sub-badminton', name: 'Badminton', slug: 'bad', level: 'SUB', parent_id: 'cat-1', min_pax: 4 },
  ];

  afterEach(() => {
    apollo.data = undefined;
  });

  it('slides between the activity minimum and the booked space capacity', () => {
    apollo.data = {
      categories: CATEGORIES,
      venueAvailableSlots: [{ id: 's1', start_at: '', end_at: '', notes: '', capacity: 30 }],
    };
    renderPayment(makeData({ clubs: [BADMINTON_CLUB] as never }), {
      club_id: 'c1',
      venue_id: 'v1',
      venue_slot_id: 's1',
      pod_mode: 'PHYSICAL',
      no_of_spots: 10,
    });
    expect(screen.getByTestId('pod-spots-slider')).toBeInTheDocument();
    expect(screen.getByText(/needs at least 4, and the space booked holds 30/)).toBeInTheDocument();
    // The plain number input gives way to the slider (which shares the label).
    expect(screen.queryByRole('spinbutton', { name: 'No. of spots' })).not.toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'No. of spots' })).toBeInTheDocument();
  });

  it('writes the dragged value back to the form', () => {
    apollo.data = {
      categories: CATEGORIES,
      venueAvailableSlots: [{ id: 's1', start_at: '', end_at: '', notes: '', capacity: 30 }],
    };
    const ref = renderPayment(makeData({ clubs: [BADMINTON_CLUB] as never }), {
      club_id: 'c1',
      venue_id: 'v1',
      venue_slot_id: 's1',
      pod_mode: 'PHYSICAL',
      no_of_spots: 10,
    });
    const slider = screen.getByRole('slider', { name: 'No. of spots' });
    fireEvent.change(slider, { target: { value: 22 } });
    expect(ref.current?.getValues('no_of_spots')).toBe(22);
  });

  it('shows a validation error on the slider, and clamps an unset count to the floor', () => {
    apollo.data = {
      categories: CATEGORIES,
      venueAvailableSlots: [{ id: 's1', start_at: '', end_at: '', notes: '', capacity: 30 }],
    };
    const ref = renderPayment(makeData({ clubs: [BADMINTON_CLUB] as never }), {
      club_id: 'c1',
      venue_id: 'v1',
      venue_slot_id: 's1',
      pod_mode: 'PHYSICAL',
      // Nothing chosen yet — the slider still has to sit at a legal value.
      no_of_spots: 0,
    });
    expect(screen.getByRole('slider', { name: 'No. of spots' })).toHaveAttribute(
      'aria-valuenow',
      '4',
    );
    // And the FORM holds 4 too — displaying the floor while storing 0 would let
    // an admin save a number they were never shown.
    expect(ref.current?.getValues('no_of_spots')).toBe(4);
    act(() => {
      ref.current?.setError('no_of_spots', { type: 'custom', message: 'Too few for this activity' });
    });
    expect(screen.getByText('Too few for this activity')).toBeInTheDocument();
  });

  it('keeps the number field, floored, when no venue caps the pod', () => {
    apollo.data = { categories: CATEGORIES, venueAvailableSlots: [] };
    renderPayment(makeData({ clubs: [BADMINTON_CLUB] as never }), {
      club_id: 'c1',
      pod_mode: 'VIRTUAL',
      no_of_spots: 10,
    });
    expect(screen.queryByTestId('pod-spots-slider')).not.toBeInTheDocument();
    expect(screen.getByLabelText('No. of spots')).toHaveAttribute('min', '4');
    expect(screen.getByText('This activity needs at least 4 people.')).toBeInTheDocument();
  });

  it('falls back to the plain hint when the activity sets no minimum', () => {
    apollo.data = { categories: [], venueAvailableSlots: [] };
    renderPayment(makeData({ clubs: [BADMINTON_CLUB] as never }), {
      club_id: 'c1',
      pod_mode: 'VIRTUAL',
      no_of_spots: 10,
    });
    expect(screen.getByLabelText('No. of spots')).toHaveAttribute('min', '0');
  });
});

// An existing pod's slot is BOOKED, so the availability list no longer carries
// its capacity - the server's podSpotLimits answers instead.
describe('PaymentSection - live-pod spot limits', () => {
  it('sizes the slider from the server range when editing an existing pod', () => {
    apollo.data = {
      categories: [],
      venueAvailableSlots: [],
      podSpotLimits: {
        current: 10,
        min: 6,
        max: 30,
        seats_taken: 6,
        venue_capacity: 30,
        min_pax: 4,
        slidable: true,
        can_decrease: false,
      },
    };
    renderPayment(makeData({ editingPodDocId: 'doc-1' }), {
      pod_id: 'DUN-POD-4821',
      pod_mode: 'PHYSICAL',
      no_of_spots: 10,
    });
    expect(screen.getByTestId('pod-spots-slider')).toBeInTheDocument();
    expect(screen.getByText(/needs at least 6, and the space booked holds 30/)).toBeInTheDocument();
  });
});

// Auto Pod mode: the type is fixed to PAID, the price floor is 1, and the
// activity minimum comes from the template's own sub-category.
describe('PaymentSection (autoPod)', () => {
  const CATEGORIES = [
    { id: 'sub-badminton', name: 'Badminton', slug: 'bad', level: 'SUB', parent_id: 'cat-1', min_pax: 3 },
  ];

  it('fixes the type, floors the price at 1 and floors spots by the template category', () => {
    apollo.data = { categories: CATEGORIES, venueAvailableSlots: [] };
    renderPayment(makeData({ config: makeConfig({ autoPod: true }) }), {
      pod_type: 'PAID',
      pod_amount: 500,
      no_of_spots: 8,
      sub_category_id: 'sub-badminton',
    });
    // The type is not chosen - the select is gone.
    expect(screen.queryByLabelText(/Pod type/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/)).toHaveAttribute('min', '1');
    expect(screen.getByText(/an Auto Pod is never free/)).toBeInTheDocument();
    expect(screen.getByLabelText('No. of spots')).toHaveAttribute('min', '3');
  });

  it('projects the payout with the venue pending, defaulting the symbol', () => {
    apollo.data = { categories: CATEGORIES, venueAvailableSlots: [], ...PROJECTION };
    renderPayment(
      makeData({
        config: makeConfig({ autoPod: true, showFinance: true }),
        finance: { platform_fee_pct: 10, gst_pct: 18 },
      }),
      { pod_type: 'PAID', pod_amount: 500, no_of_spots: 10, sub_category_id: 'sub-badminton' },
    );
    // The venue that enrols later is a deduction nobody can price yet.
    expect(screen.getByText(/Deducted once a venue enrols/)).toBeInTheDocument();
    expect(screen.getByText('Host receives before the venue')).toBeInTheDocument();
  });
});
