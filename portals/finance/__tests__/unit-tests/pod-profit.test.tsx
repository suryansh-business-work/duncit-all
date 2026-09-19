import { describe, expect, it } from 'vitest';
import { renderHook, screen, fireEvent, within } from '@testing-library/react';
import { DEFAULT_INPUTS, formatRupees, type PodProfitInputs } from '../../src/pages/calculators/pod-profit/types';
import { useCalculator } from '../../src/pages/calculators/pod-profit/useCalculator';
import PodProfitCalculatorPage from '../../src/pages/calculators/pod-profit';
import { renderWithProviders } from '../testkit';
import { calculatorDefaultsMock, podCalculatorsMock } from '../mocks/pod-calculator.mock';

// The page reads its tab from `?selectedtab=` (useTabParam), so it needs the
// router renderWithProviders mounts, and the Single tab waits for Default
// Deductions and the saved list before it draws the calculator.
const renderPage = () =>
  renderWithProviders(<PodProfitCalculatorPage />, {
    mocks: [calculatorDefaultsMock(), podCalculatorsMock('SINGLE', [])],
  });

describe('pod-profit types', () => {
  it('formatRupees renders currency and guards non-finite values', () => {
    expect(formatRupees(1000)).toContain('1,000');
    expect(formatRupees(Number.NaN)).toContain('0');
    expect(formatRupees(Number.POSITIVE_INFINITY)).toContain('0');
  });

  it('exposes default inputs', () => {
    expect(DEFAULT_INPUTS.pod_amount).toBe(1000);
  });
});

describe('useCalculator', () => {
  const calc = (inputs: PodProfitInputs) => renderHook(() => useCalculator(inputs)).result.current;

  it('runs the full waterfall for the defaults, billing payable spots only', () => {
    const r = calc(DEFAULT_INPUTS);
    // The host's own spot is free: 30 spots bill 29 guests (₹1,000 × 29).
    expect(r.total_spots).toBe(30);
    expect(r.payable_spots).toBe(29);
    expect(r.collection_total).toBe(29000);
    expect(r.reconciled_total).toBeCloseTo(r.collection_total, 1);
    expect(r.host_earn_percent).toBeGreaterThan(0);
  });

  it('bills nothing for a host-only pod and never goes negative on 0 spots', () => {
    const solo = calc({ ...DEFAULT_INPUTS, no_of_spots: 1 });
    expect(solo.payable_spots).toBe(0);
    expect(solo.collection_total).toBe(0);

    const unset = calc({ ...DEFAULT_INPUTS, no_of_spots: 0 });
    expect(unset.payable_spots).toBe(0);
    expect(unset.collection_total).toBe(0);
  });

  it('takes the club-admin cut off the pool and folds it into Duncit revenue', () => {
    // Mirrors server breakdown.math.ts: GST -> platform fee -> club admin ->
    // venue slot price -> host remainder. Numbers match the server integration
    // test (₹1,000 gross, 18% GST, 5% fee, 10% club admin, no venue).
    const r = calc({
      ...DEFAULT_INPUTS,
      pod_amount: 1000,
      no_of_spots: 2, // 1 payable spot -> ₹1,000 gross
      venue_amount: 0,
      club_admin_percent: 10,
      host_commission_percent: 10,
    });
    expect(r.collection_total).toBe(1000);
    expect(r.club_admin_amount).toBe(80.51); // pool 805.09 x 10%
    expect(r.host_amount).toBe(724.58); // pool - club admin (no venue)
    expect(r.host_receives).toBe(652.12); // - 10% host commission
    expect(r.duncit_revenue_total).toBe(195.34); // fee 42.37 + host comm 72.46 + club admin 80.51
    expect(r.reconciled_total).toBeCloseTo(1000, 2);
  });

  it('clamps the club-admin cut to the pool and passes the venue shortfall to the host', () => {
    // A 100% cut takes the whole pool. The venue is still owed its full ₹500
    // (the engine's clampVenueToPool: false), so the host side goes ₹500
    // negative and carries no commission.
    const r = calc({ ...DEFAULT_INPUTS, club_admin_percent: 100, venue_amount: 500 });
    expect(r.club_admin_amount).toBe(r.pool_amount);
    expect(r.venue_amount).toBe(500);
    expect(r.venue_receives).toBe(450);
    expect(r.host_amount).toBe(-500);
    expect(r.host_commission_amount).toBe(0);
    expect(r.host_receives).toBe(-500);
    expect(r.reconciled_total).toBeCloseTo(r.collection_total, 2);
  });

  it('returns zeroed host-earn when the collection is zero', () => {
    const r = calc({ ...DEFAULT_INPUTS, pod_amount: 0, no_of_spots: 0 });
    expect(r.collection_total).toBe(0);
    expect(r.host_earn_percent).toBe(0);
  });

  it('clamps percentages to 0–100 but never clamps the venue amount', () => {
    const r = calc({
      ...DEFAULT_INPUTS,
      pod_amount: 100,
      no_of_spots: 2, // 1 payable spot -> ₹100 gross
      gst_percent: 150,
      platform_fee_percent: -10,
      host_commission_percent: 200,
      venue_commission_percent: -1,
      venue_amount: 100000,
    });
    // 150% GST reads as 100%: half of a GST-inclusive ₹100 is tax.
    expect(r.gst_amount).toBe(50);
    // A negative fee and venue commission read as 0%.
    expect(r.platform_fee_amount).toBe(0);
    expect(r.venue_commission_amount).toBe(0);
    // The venue is owed its full booked price, far beyond the ₹50 pool.
    expect(r.venue_amount).toBe(100000);
    expect(r.venue_amount).toBeGreaterThan(r.pool_amount);
    expect(r.host_amount).toBeLessThan(0);
    // No commission on a negative host side, however high the rate.
    expect(r.host_commission_amount).toBe(0);
    expect(r.reconciled_total).toBeCloseTo(r.collection_total, 2);
  });
});

describe('PodProfitCalculatorPage', () => {
  it('renders, edits inputs and resets', async () => {
    renderPage();
    expect(screen.getByText('Pod Profit Calculator')).toBeInTheDocument();

    // Pod pricing inputs
    const ticket = await screen.findByLabelText<HTMLInputElement>('Ticket price per spot (GST-inclusive)');
    fireEvent.change(ticket, { target: { value: '2000' } });
    expect(ticket.value).toBe('2000');
    // negative clamps to 0
    fireEvent.change(ticket, { target: { value: '-5' } });
    expect(ticket.value).toBe('0');

    const spots = screen.getByLabelText<HTMLInputElement>('No. of spots');
    fireEvent.change(spots, { target: { value: '12.7' } });
    expect(spots.value).toBe('13');

    // PercentSlider number field (GST has max 28, so no marks branch)
    const gstField = screen.getAllByLabelText<HTMLInputElement>('GST')[0];
    fireEvent.change(gstField, { target: { value: '40' } });
    expect(gstField.value).toBe('28'); // clamped to max

    // A 100-max slider (platform fee) to hit the marks branch
    const feeField = screen.getAllByLabelText<HTMLInputElement>('Platform fee — Duncit income')[0];
    fireEvent.change(feeField, { target: { value: '7' } });
    expect(feeField.value).toBe('7');

    // Venue fixed cost
    const venue = screen.getByLabelText<HTMLInputElement>('Venue fixed cost');
    fireEvent.change(venue, { target: { value: '500' } });
    expect(venue.value).toBe('500');
    fireEvent.change(venue, { target: { value: '-1' } });
    expect(venue.value).toBe('0');

    // Venue, host and club-admin sliders (VenueHostCard)
    const venueCommission = screen.getAllByLabelText<HTMLInputElement>('Venue commission — Duncit income')[0];
    fireEvent.change(venueCommission, { target: { value: '12' } });
    expect(venueCommission.value).toBe('12');
    const hostCommission = screen.getAllByLabelText<HTMLInputElement>('Host commission — Duncit income')[0];
    fireEvent.change(hostCommission, { target: { value: '8' } });
    expect(hostCommission.value).toBe('8');
    const clubAdmin = screen.getAllByLabelText<HTMLInputElement>('Club admin cut — Duncit income')[0];
    fireEvent.change(clubAdmin, { target: { value: '60' } });
    expect(clubAdmin.value).toBe('50'); // clamped to its 50% max

    // Reset restores defaults
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByLabelText<HTMLInputElement>('Ticket price per spot (GST-inclusive)').value).toBe('1000');
  });

  it('moves a slider via the slider input', async () => {
    renderPage();
    await screen.findByLabelText('Ticket price per spot (GST-inclusive)');
    const sliders = screen.getAllByLabelText<HTMLInputElement>('GST');
    // The MUI Slider exposes a hidden range input we can change.
    const sliderInput = sliders.find((el) => el.type === 'range');
    expect(sliderInput).toBeDefined();
    fireEvent.change(sliderInput as HTMLInputElement, { target: { value: '10' } });
    expect(sliderInput?.value).toBe('10');
    // …and the number field beside it follows.
    expect(sliders[0].value).toBe('10');
  });

  it('shows results reconciling to the collection', async () => {
    renderPage();
    const heading = await screen.findByText('Results');
    const results = heading.closest('div')?.parentElement as HTMLElement;
    expect(within(results).getByText(/host take-home/i)).toBeInTheDocument();
    expect(within(results).getByText('Reconciles to collection')).toBeInTheDocument();
  });

  it('projects the pod across a count that never drops below one', async () => {
    renderPage();
    const count = await screen.findByLabelText<HTMLInputElement>('Total number of pods');
    expect(screen.queryByText('Across all pods')).toBeNull();

    fireEvent.change(count, { target: { value: '4' } });
    expect(count.value).toBe('4');
    expect(screen.getByText('Across all pods')).toBeInTheDocument();

    // Clearing the field reads as one pod, not zero.
    fireEvent.change(count, { target: { value: '' } });
    expect(count.value).toBe('1');
    expect(screen.queryByText('Across all pods')).toBeNull();
  });

  it('switches to the Multiple pods tab', async () => {
    renderWithProviders(<PodProfitCalculatorPage />, {
      mocks: [calculatorDefaultsMock(), podCalculatorsMock('SINGLE', []), podCalculatorsMock('MULTI', [])],
    });
    await screen.findByLabelText('Ticket price per spot (GST-inclusive)');
    fireEvent.click(screen.getByRole('tab', { name: 'Multiple pods' }));
    expect(await screen.findByText(/Every comparison is saved/)).toBeInTheDocument();
    expect(screen.getByTestId('table-empty')).toHaveTextContent('No saved comparisons yet');
  });
});
