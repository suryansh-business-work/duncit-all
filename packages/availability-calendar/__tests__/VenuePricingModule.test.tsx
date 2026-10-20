import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { notifySuccess } from '@duncit/dialogs';
import VenuePricingModule from '../src/pricing/VenuePricingModule';
import { UPDATE_VENUE_PRICING, VENUE_BOOKING_CALENDAR, VENUE_PRICE_QUOTE, VENUE_PRICING } from '../src/pricing/queries';
import { UPDATE_VENUE_SETTINGS, VENUE_SLOTS } from '../src/queries';
import { toFormValues, toPricingInput } from '../src/pricing/form';
import type { EditorVenue } from '../src/VenueAvailabilityEditor';
import type { VenuePricingData } from '../src/pricing/types';
import { breakdownResult, makeBreakdown, makePricing, pricingResult } from './pricing-fixtures';

vi.mock('@mui/x-date-pickers/DatePicker', async () => ({ DatePicker: (await import('./picker-stub')).PickerStub }));
vi.mock('@mui/x-date-pickers/TimePicker', async () => ({ TimePicker: (await import('./picker-stub')).PickerStub }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<object>()), notifySuccess: vi.fn() }));

const VENUE_ID = 'venue-1';
const SETTLED = { timeout: 3000 };

const venue: EditorVenue = {
  id: VENUE_ID,
  status: 'APPROVED',
  venue_name: 'Skyline Banquets',
  capacity: 120,
  capacity_items: [],
  settings: {
    operating_hours: { open: '09:00', close: '23:00' },
    weekly_off_days: [],
    holidays: ['2026-12-25'],
    rules: { buffer_minutes: 0, min_notice_minutes: 0, max_advance_days: 60, max_bookings_per_slot: 1 },
    auto_extend: { enabled: false, template_id: null, horizon_days: 30, until: '' },
  },
};

const pricingMock = (pricing: VenuePricingData, delay?: number): MockedResponse => ({
  request: { query: VENUE_PRICING, variables: { venue_id: VENUE_ID } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  delay,
  result: { data: { venuePricing: pricingResult(pricing) } },
});

/** The month around the module: no slots, an empty calendar, and a quote for the preview. */
const surroundings: MockedResponse[] = [
  { request: { query: VENUE_SLOTS, variables: () => true }, maxUsageCount: Number.POSITIVE_INFINITY, result: { data: { venueSlots: [] } } },
  {
    request: { query: VENUE_BOOKING_CALENDAR, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        venueBookingCalendar: {
          __typename: 'VenueBookingCalendar',
          model: 'PER_PAX',
          configured: true,
          booking_increment_minutes: 60,
          min_hours: 1,
          max_hours: 0,
          min_pax: 1,
          max_pax: 0,
          days: [],
        },
      },
    },
  },
  {
    request: { query: VENUE_PRICE_QUOTE, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { venuePriceQuote: breakdownResult(makeBreakdown()) } },
  },
];

function renderModule(mocks: MockedResponse[], onVenueChanged?: () => void) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks, ...surroundings]}>
      <VenuePricingModule venue={venue} onVenueChanged={onVenueChanged} />
    </MockedProvider>,
  );
}

const save = () => screen.getByRole('button', { name: 'Save pricing' });

describe('VenuePricingModule', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 1, 12));
    vi.mocked(notifySuccess).mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a loader until the saved pricing arrives', () => {
    renderModule([pricingMock(makePricing(), 60_000)]);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.queryByTestId('venue-pricing-form')).not.toBeInTheDocument();
  });

  it("says why the pricing could not be loaded", async () => {
    renderModule([{ request: { query: VENUE_PRICING, variables: { venue_id: VENUE_ID } }, result: { errors: [new GraphQLError('You do not manage this venue')] } }]);
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not manage this venue');
    expect(screen.queryByTestId('venue-pricing-form')).not.toBeInTheDocument();
  });

  it('warns that hosts cannot book until pricing is saved, and draws the form, preview and calendar', async () => {
    renderModule([pricingMock(makePricing({ configured: false, model: null }))]);
    expect(await screen.findByTestId('venue-pricing-not-configured')).toHaveTextContent(
      'Hosts cannot book this venue until you choose a pricing model and save it.',
    );
    expect(screen.getByTestId('venue-pricing-form')).toBeInTheDocument();
    expect(screen.getByText('Live price preview')).toBeInTheDocument();
    expect(screen.getByTestId('pricing-calendar')).toBeInTheDocument();
    // The venue's own holiday comes from its settings.
    expect(within(screen.getByTestId('availability-day-2026-12-25')).getByLabelText('Venue on leave')).toBeInTheDocument();
    expect(within(screen.getByTestId('availability-day-2026-12-24')).queryByLabelText('Venue on leave')).not.toBeInTheDocument();
  });

  it('saves the form with updateVenuePricing, keeping the saved blocked dates, and confirms it', async () => {
    const saved = makePricing({ blocked_dates: ['2026-12-20'] });
    const sent: Record<string, any>[] = [];
    const update: MockedResponse = {
      request: { query: UPDATE_VENUE_PRICING, variables: () => true },
      result: (variables: Record<string, any>) => {
        sent.push(variables);
        return { data: { updateVenuePricing: pricingResult({ ...saved, base_rate: 450 }) } };
      },
    };
    renderModule([pricingMock(saved), update]);
    await screen.findByTestId('venue-pricing-form');
    expect(screen.queryByTestId('venue-pricing-not-configured')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Rate per guest'), { target: { value: '450' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Pricing saved. Hosts now book at these prices.'));
    expect(sent).toEqual([{ venue_id: VENUE_ID, input: toPricingInput({ ...toFormValues(saved), base_rate: 450 }) }]);
    expect(sent[0].input.blocked_dates).toEqual(['2026-12-20']);
    // The answer replaces the read in the cache, so the form is clean on the new values.
    await waitFor(() => expect(save()).toBeDisabled());
    expect(screen.getByLabelText('Rate per guest')).toHaveValue(450);
  });

  it("shows the server's BAD_USER_INPUT message when the save is refused", async () => {
    const refused: MockedResponse = {
      request: { query: UPDATE_VENUE_PRICING, variables: () => true },
      result: { errors: [new GraphQLError('base_rate must be at most 1000000', { extensions: { code: 'BAD_USER_INPUT' } })] },
    };
    renderModule([pricingMock(makePricing()), refused]);
    await screen.findByTestId('venue-pricing-form');

    fireEvent.change(screen.getByLabelText('Rate per guest'), { target: { value: '999999' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());

    expect(await screen.findByTestId('form-actions-row-error')).toHaveTextContent('base_rate must be at most 1000000');
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Rate per guest')).toHaveValue(999999);
  });

  it('marks a holiday in the venue settings and tells the host to re-read the venue', async () => {
    const sent: Record<string, any>[] = [];
    const settings: MockedResponse = {
      request: { query: UPDATE_VENUE_SETTINGS, variables: () => true },
      result: (variables: Record<string, any>) => {
        sent.push(variables);
        return { data: { updateVenueSettings: { __typename: 'Venue', id: VENUE_ID, settings: null } } };
      },
    };
    const onVenueChanged = vi.fn();
    renderModule([pricingMock(makePricing()), settings], onVenueChanged);
    await waitFor(() => expect(screen.getByTestId('availability-day-2026-12-02')).toHaveTextContent('₹300 / guest'));

    fireEvent.click(screen.getByTestId('availability-day-2026-12-02'));
    const day = within(await screen.findByRole('presentation'));
    fireEvent.click(day.getByTestId('pricing-day-holiday').querySelector('input') as HTMLInputElement);

    await waitFor(() => expect(onVenueChanged).toHaveBeenCalledTimes(1), SETTLED);
    expect(sent).toEqual([{ venue_doc_id: VENUE_ID, input: { holidays: ['2026-12-02', '2026-12-25'] } }]);
  });

  it('marks a holiday without a host to tell', async () => {
    let calls = 0;
    const settings: MockedResponse = {
      request: { query: UPDATE_VENUE_SETTINGS, variables: () => true },
      result: () => {
        calls += 1;
        return { data: { updateVenueSettings: { __typename: 'Venue', id: VENUE_ID, settings: null } } };
      },
    };
    renderModule([pricingMock(makePricing()), settings]);
    await waitFor(() => expect(screen.getByTestId('availability-day-2026-12-02')).toHaveTextContent('₹300 / guest'));
    fireEvent.click(screen.getByTestId('availability-day-2026-12-02'));
    const day = within(await screen.findByRole('presentation'));
    fireEvent.click(day.getByTestId('pricing-day-holiday').querySelector('input') as HTMLInputElement);
    await waitFor(() => expect(calls).toBe(1));
    expect(day.queryByText("We couldn't update this date. Please try again.")).not.toBeInTheDocument();
  });
});
