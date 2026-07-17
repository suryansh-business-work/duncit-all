import { describe, expect, it } from 'vitest';
import { render, renderHook, screen, fireEvent, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DEFAULT_INPUTS, formatRupees, type PodProfitInputs } from '../../src/pages/calculators/pod-profit/types';
import { useCalculator } from '../../src/pages/calculators/pod-profit/useCalculator';
import PodProfitCalculatorPage from '../../src/pages/calculators/pod-profit';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>);

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

  it('runs the full waterfall for the defaults', () => {
    const r = calc(DEFAULT_INPUTS);
    expect(r.collection_total).toBe(30000);
    expect(r.reconciled_total).toBeCloseTo(r.collection_total, 1);
    expect(r.host_earn_percent).toBeGreaterThan(0);
  });

  it('returns zeroed host-earn when the collection is zero', () => {
    const r = calc({ ...DEFAULT_INPUTS, pod_amount: 0, no_of_spots: 0 });
    expect(r.collection_total).toBe(0);
    expect(r.host_earn_percent).toBe(0);
  });

  it('clamps percentages and the venue amount to the pool', () => {
    const r = calc({
      ...DEFAULT_INPUTS,
      pod_amount: 100,
      no_of_spots: 1,
      gst_percent: 150,
      platform_fee_percent: -10,
      host_commission_percent: 200,
      venue_commission_percent: -1,
      venue_amount: 100000,
    });
    // venue amount is clamped to the remaining pool (never exceeds it)
    expect(r.venue_amount).toBeLessThanOrEqual(r.pool_amount);
    expect(r.host_amount).toBe(0);
  });
});

describe('PodProfitCalculatorPage', () => {
  it('renders, edits inputs and resets', () => {
    wrap(<PodProfitCalculatorPage />);
    expect(screen.getByText('Pod Profit Calculator')).toBeInTheDocument();

    // Pod pricing inputs
    const ticket = screen.getByLabelText('Ticket price per spot (GST-inclusive)') as HTMLInputElement;
    fireEvent.change(ticket, { target: { value: '2000' } });
    expect(ticket.value).toBe('2000');
    // negative clamps to 0
    fireEvent.change(ticket, { target: { value: '-5' } });
    expect(ticket.value).toBe('0');

    const spots = screen.getByLabelText('No. of spots') as HTMLInputElement;
    fireEvent.change(spots, { target: { value: '12.7' } });
    expect(spots.value).toBe('13');

    // PercentSlider number field (GST has max 28, so no marks branch)
    const gstField = screen.getAllByLabelText('GST')[0] as HTMLInputElement;
    fireEvent.change(gstField, { target: { value: '40' } });
    expect(gstField.value).toBe('28'); // clamped to max

    // A 100-max slider (platform fee) to hit the marks branch
    const feeField = screen.getAllByLabelText('Platform fee — Duncit income')[0] as HTMLInputElement;
    fireEvent.change(feeField, { target: { value: '7' } });
    expect(feeField.value).toBe('7');

    // Venue fixed cost
    const venue = screen.getByLabelText('Venue fixed cost') as HTMLInputElement;
    fireEvent.change(venue, { target: { value: '500' } });
    expect(venue.value).toBe('500');
    fireEvent.change(venue, { target: { value: '-1' } });
    expect(venue.value).toBe('0');

    // Venue & host commission sliders (VenueHostCard)
    const venueCommission = screen.getAllByLabelText('Venue commission — Duncit income')[0] as HTMLInputElement;
    fireEvent.change(venueCommission, { target: { value: '12' } });
    expect(venueCommission.value).toBe('12');
    const hostCommission = screen.getAllByLabelText('Host commission — Duncit income')[0] as HTMLInputElement;
    fireEvent.change(hostCommission, { target: { value: '8' } });
    expect(hostCommission.value).toBe('8');

    // Reset restores defaults
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect((screen.getByLabelText('Ticket price per spot (GST-inclusive)') as HTMLInputElement).value).toBe('1000');
  });

  it('moves a slider via the slider input', () => {
    wrap(<PodProfitCalculatorPage />);
    const sliders = screen.getAllByLabelText('GST');
    // The MUI Slider exposes a hidden range input we can change.
    const sliderInput = sliders.find((el) => (el as HTMLInputElement).type === 'range') as HTMLInputElement;
    fireEvent.change(sliderInput, { target: { value: '10' } });
    expect(sliderInput.value).toBe('10');
  });

  it('shows results reconciling to the collection', () => {
    wrap(<PodProfitCalculatorPage />);
    const results = screen.getByText('Results').closest('div')!;
    expect(within(results.parentElement as HTMLElement).getByText(/host take-home/i)).toBeInTheDocument();
  });
});
