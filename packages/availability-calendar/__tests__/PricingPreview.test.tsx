import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import PricingPreview from '../src/pricing/preview/PricingPreview';
import { VENUE_PRICE_QUOTE } from '../src/pricing/queries';
import { toFormValues, toPricingInput, type VenuePricingFormValues } from '../src/pricing/form';
import { breakdownResult, makeBreakdown, makePricing } from './pricing-fixtures';

vi.mock('@mui/x-date-pickers/DatePicker', async () => ({ DatePicker: (await import('./picker-stub')).PickerStub }));
vi.mock('@mui/x-date-pickers/TimePicker', async () => ({ TimePicker: (await import('./picker-stub')).PickerStub }));

const VENUE_ID = 'venue-1';
/** Long enough for the preview's 500ms debounce to settle and the answer to arrive. */
const SETTLED = { timeout: 3000 };
const at = (d: number, h: number, m = 0) => new Date(2026, 11, d, h, m).toISOString();

/** Answers every quote with `answer`, recording what each request carried. */
function quoteMock(seen: Record<string, any>[], answer: (v: Record<string, any>) => object = () => ({ data: { venuePriceQuote: breakdownResult(makeBreakdown()) } })): MockedResponse {
  return {
    request: { query: VENUE_PRICE_QUOTE, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: (variables: Record<string, any>) => {
      seen.push(variables);
      return answer(variables) as never;
    },
  };
}

function renderPreview(mocks: MockedResponse[], values: VenuePricingFormValues = toFormValues(makePricing()), valid = true) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <PricingPreview venueId={VENUE_ID} values={values} valid={valid} />
    </MockedProvider>,
  );
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('PricingPreview', () => {
  beforeEach(() => {
    // Only the clock is fixed (1 Dec 2026, noon): the debounce and Apollo keep real timers.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 1, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("prices tomorrow evening with the UNSAVED form as the draft, and shows Duncit's fee on top", async () => {
    const seen: Record<string, any>[] = [];
    const values = { ...toFormValues(makePricing()), base_rate: 450 };
    renderPreview([quoteMock(seen)], values);

    expect(await screen.findByTestId('price-breakdown', undefined, SETTLED)).toBeInTheDocument();
    expect(seen[0]).toEqual({
      venue_id: VENUE_ID,
      booking: { start_at: at(2, 18), end_at: at(2, 20), pax: 10, pets: false },
      draft: toPricingInput(values),
    });
    expect(screen.getByTestId('price-line-payout')).toHaveTextContent('₹6,000');
    expect(screen.getByTestId('price-line-fee')).toHaveTextContent("Duncit fee 10% (added on top, paid from the host's share)₹600");
    expect(screen.getByTestId('price-line-total')).toHaveTextContent('₹6,600');
  });

  it('asks again, after the owner stops typing, for the sample they changed', async () => {
    const seen: Record<string, any>[] = [];
    renderPreview([quoteMock(seen)]);
    await screen.findByTestId('price-breakdown', undefined, SETTLED);

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-12-05T00:00' } });
    fireEvent.change(screen.getByLabelText('Guests'), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-12-05T10:00' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-12-05T13:30' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Brings pets' }));
    // The last answer stays up while the new one is worked out.
    expect(screen.getByRole('progressbar', { name: 'Working out the price' })).toBeInTheDocument();
    expect(screen.getByTestId('price-breakdown')).toBeInTheDocument();

    await waitFor(() => expect(seen).toHaveLength(2), SETTLED);
    expect(seen[1].booking).toEqual({ start_at: at(5, 10), end_at: at(5, 13, 30), pax: 25, pets: true });
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(), SETTLED);
  });

  it('sends emptied guests as 0', async () => {
    const seen: Record<string, any>[] = [];
    renderPreview([quoteMock(seen)]);
    fireEvent.change(screen.getByLabelText('Guests'), { target: { value: '' } });
    expect(screen.getByLabelText('Guests')).toHaveValue(0);
    await waitFor(() => expect(seen.at(-1)?.booking.pax).toBe(0), SETTLED);
  });

  it('asks nothing while the form is invalid, and says why', async () => {
    const seen: Record<string, any>[] = [];
    renderPreview([quoteMock(seen)], toFormValues(makePricing()), false);
    expect(screen.getByText('Fix the highlighted fields to see the price.')).toBeInTheDocument();
    await pause(700);
    expect(seen).toHaveLength(0);
    expect(screen.queryByTestId('price-breakdown')).not.toBeInTheDocument();
  });

  it('asks for a window that ends after it starts', async () => {
    const seen: Record<string, any>[] = [];
    renderPreview([quoteMock(seen)]);
    await screen.findByTestId('price-breakdown', undefined, SETTLED);
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-12-02T17:00' } });
    expect(screen.getByText('Pick a start and end time to see the price.')).toBeInTheDocument();
    await pause(700);
    expect(seen).toHaveLength(1);
  });

  it("shows the server's reason when it cannot price the sample", async () => {
    const seen: Record<string, any>[] = [];
    renderPreview([quoteMock(seen, () => ({ errors: [new GraphQLError('Venue is closed on that date')] }))]);
    expect(await screen.findByTestId('pricing-preview-error', undefined, SETTLED)).toHaveTextContent('Venue is closed on that date');
    expect(screen.queryByTestId('price-breakdown')).not.toBeInTheDocument();
  });

  describe('per-slot venue', () => {
    const slotValues = (days: number[]) => ({
      ...toFormValues(makePricing({ model: 'PER_SLOT', base_rate: 0 })),
      slots: [
        { start_time: '10:00', end_time: '12:00', price: 800, days_of_week: days },
        { start_time: '14:00', end_time: '17:00', price: 1200, days_of_week: days },
      ],
    });

    it("samples one of the slots that run on the sample's weekday", async () => {
      const seen: Record<string, any>[] = [];
      // Tomorrow, 2 Dec 2026, is a Wednesday (3).
      renderPreview([quoteMock(seen)], slotValues([3]));
      expect(screen.queryByLabelText('Starts')).not.toBeInTheDocument();

      fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Slot' }));
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
      expect(options[1]).toHaveTextContent('₹1,200');
      fireEvent.click(options[1]);

      await waitFor(() => expect(seen.at(-1)?.booking).toMatchObject({ start_at: at(2, 14), end_at: at(2, 17) }), SETTLED);
      expect(screen.getByRole('combobox', { name: 'Slot' })).toHaveTextContent('₹1,200');
    });

    it('says when no slot runs that day', () => {
      renderPreview([quoteMock([])], slotValues([0]));
      expect(screen.getByText('No slot runs on that day.')).toBeInTheDocument();
    });

    it('finds no slot on a sample day that is not a date', () => {
      renderPreview([quoteMock([])], slotValues([0, 1, 2, 3, 4, 5, 6]));
      fireEvent.change(screen.getByLabelText('Date'), { target: { value: 'not a date' } });
      expect(screen.getByText('No slot runs on that day.')).toBeInTheDocument();
    });
  });
});
