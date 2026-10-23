/**
 * The venue's enrolment dialog.
 *
 * Accepting and fixing the time are ONE action (an acceptance with no date
 * leaves the offer half-claimed with nothing for a host to see), the venue is
 * the one chosen at the top of the queue, and it proposes its own time and
 * price, priced by the server before it is sent. It may never report success
 * the server never gave: with nothing answering, no callback fires.
 */
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mwebAutoPodLabels, type AutoPodLocation, type AutoPodRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VenueAcceptDialog } from '../src/venue/VenueAcceptDialog';
import type { AutoPodVenueOption } from '../src/venue/AutoPodVenuePicker';
import { AUTO_POD_VENUE_QUOTE, VENUE_ACCEPT_AUTO_POD, autoPodVenueOffer } from '../src/queries';

// MUI X wants a LocalizationProvider and a real calendar; a plain input that
// hands back a Date is all the proposal form reads.
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ label, value, onChange }: { label: string; value: Date | null; onChange: (d: Date | null) => void }) => (
    <input aria-label={label} value={value ? value.toISOString() : ''} onChange={(e) => onChange(new Date(e.target.value))} />
  ),
}));
vi.mock('@mui/x-date-pickers/TimePicker', () => ({
  TimePicker: ({ label, value, onChange }: { label: string; value: Date | null; onChange: (d: Date | null) => void }) => (
    <input aria-label={label} value={value ? value.toISOString() : ''} onChange={(e) => onChange(new Date(e.target.value))} />
  ),
}));

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const labels = mwebAutoPodLabels(t);
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 450);
    });
  });
};

const BENGALURU: AutoPodLocation = {
  location_id: 'loc-blr',
  location_name: 'Bengaluru',
  country: 'India',
  state: 'Karnataka',
  city: 'Bengaluru',
  bound_by: 'HOST',
  bound_at: '2026-08-20T10:00:00.000Z',
};

const row = (over: Partial<AutoPodRow> = {}): AutoPodRow =>
  ({
    id: 'ap-1',
    auto_pod_no: 'DUN-AP-001',
    stage: 'OPEN',
    pod_title: 'Weekly Badminton',
    pod_description: 'Doubles, all levels.',
    pod_images_and_videos: [],
    sub_category_id: 'sub-1',
    category_name: 'Badminton',
    pod_amount: 250,
    no_of_spots: 8,
    venue_claim: null,
    host_claim: null,
    club_claim: null,
    location: null,
    viewer_claimed: false,
    pod_id: null,
    expected_host_earnings: 1400,
    ...over,
  }) as AutoPodRow;

const venue = (over: Partial<AutoPodVenueOption> = {}): AutoPodVenueOption => ({
  id: 'v-1',
  venue_name: 'Indiranagar Court',
  status: 'APPROVED',
  is_active: true,
  location_id: 'loc-blr',
  city: 'Bengaluru',
  venue_category: null,
  ...over,
});

const breakdown = {
  __typename: 'VenuePriceBreakdown',
  model: 'FLAT',
  rate: 2000,
  pax: 8,
  hours: 2,
  date: '2026-09-01',
  base: 2000,
  rules: [],
  rules_total: 0,
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  venue_price: 2000,
  gst_pct: 0,
  taxes: 0,
  venue_payout: 2000,
  platform_fee_pct: 10,
  platform_fee: 200,
  total: 2200,
  deposit: 0,
};

const quoteMock = (seen: Record<string, unknown>[] = []): MockedResponse => ({
  request: { query: AUTO_POD_VENUE_QUOTE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: (variables: Record<string, unknown>) => {
    seen.push(variables);
    return { data: { autoPodVenueQuote: { __typename: 'VenueOfferQuoteResult', ok: true, message: null, quote: breakdown } } } as never;
  },
});

const acceptMock = (seen: Record<string, unknown>[], answer: MockedResponse['result'] | Error): MockedResponse => ({
  request: { query: VENUE_ACCEPT_AUTO_POD, variables: () => true },
  ...(answer instanceof Error
    ? { error: answer }
    : {
        result: (variables: Record<string, unknown>) => {
          seen.push(variables);
          return answer as never;
        },
      }),
});

const wrap = (ui: ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>,
  );

const typeAmount = (value: string) => fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value } });

const press = async (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
  await settle();
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('autoPodVenueOffer', () => {
  it('drops the guests — an Auto Pod books for its own spots', () => {
    expect(
      autoPodVenueOffer({ start_at: 'S', end_at: 'E', space_label: 'Court 2', pax: 30, model: 'PER_HOUR', rate: 900 }),
    ).toEqual({ start_at: 'S', end_at: 'E', space_label: 'Court 2', model: 'PER_HOUR', rate: 900 });
  });
});

describe('VenueAcceptDialog', () => {
  const props = { labels, onClose: vi.fn(), onAccepted: vi.fn() };

  it('renders nothing at all while it is closed', () => {
    wrap(<VenueAcceptDialog {...props} row={row()} venue={venue()} open={false} />);
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens without a row rather than naming a pod it does not have, and asks for no time', async () => {
    wrap(<VenueAcceptDialog {...props} row={null} venue={venue()} open />);
    await settle();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Weekly Badminton');
    expect(screen.queryByLabelText('Amount (₹)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: labels.acceptCta })).toBeDisabled();
  });

  it('asks for a venue when none was picked at the top', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} venue={null} open />);
    await settle();
    expect(document.body.textContent).toContain(labels.pickVenueFirst);
    expect(screen.queryByLabelText('Amount (₹)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: labels.acceptCta })).toBeDisabled();
  });

  it('refuses a venue outside the city the offer is pinned to', async () => {
    wrap(
      <VenueAcceptDialog {...props} row={row({ location: BENGALURU })} venue={venue({ location_id: 'loc-mum' })} open />,
    );
    await settle();
    expect(document.body.textContent).toContain(labels.noVenueInCity('Bengaluru'));
    expect(screen.queryByLabelText('Amount (₹)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: labels.acceptCta })).toBeDisabled();
  });

  it('names the pod and the venue, and prices the time and terms the venue proposes', async () => {
    const seen: Record<string, unknown>[] = [];
    wrap(<VenueAcceptDialog {...props} row={row({ location: BENGALURU })} venue={venue()} open />, [quoteMock(seen)]);
    expect(document.body.textContent).toContain('Weekly Badminton');
    expect(document.body.textContent).toContain(labels.acceptingWith('Indiranagar Court'));
    expect(screen.queryByLabelText('Guests')).not.toBeInTheDocument();

    typeAmount('2000');
    await settle();
    expect(await screen.findByTestId('price-breakdown')).toHaveTextContent('₹2,200');
    expect(seen[0]).toMatchObject({ auto_pod_doc_id: 'ap-1', venue_id: 'v-1', offer: { model: 'FLAT', rate: 2000, space_label: '' } });
    expect(seen[0]).not.toHaveProperty('offer.pax');
  });

  it('accepts the offer at the proposed time and price and tells the caller, once', async () => {
    const onAccepted = vi.fn();
    const onClose = vi.fn();
    const sent: Record<string, unknown>[] = [];
    wrap(<VenueAcceptDialog {...props} onAccepted={onAccepted} onClose={onClose} row={row()} venue={venue()} open />, [
      quoteMock(),
      acceptMock(sent, { data: { venueAcceptAutoPod: null } }),
    ]);
    typeAmount('2000');
    await press(labels.acceptCta);
    expect(sent[0]).toMatchObject({ auto_pod_doc_id: 'ap-1', venue_id: 'v-1', offer: { model: 'FLAT', rate: 2000 } });
    expect(onAccepted).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the server’s refusal, reports nothing, and clears it when dismissed', async () => {
    const onAccepted = vi.fn();
    const onClose = vi.fn();
    wrap(<VenueAcceptDialog {...props} onAccepted={onAccepted} onClose={onClose} row={row()} venue={venue()} open />, [
      quoteMock(),
      acceptMock([], new Error('Another venue took this offer first')),
    ]);
    typeAmount('2000');
    await press(labels.acceptCta);
    expect(screen.getByTestId('auto-pod-venue-accept-error')).toHaveTextContent(/./);
    expect(onAccepted).not.toHaveBeenCalled();

    await press(labels.dismiss);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('auto-pod-venue-accept-error')).not.toBeInTheDocument();
  });

  it('never reports an acceptance the server did not confirm', async () => {
    const onAccepted = vi.fn();
    wrap(<VenueAcceptDialog {...props} onAccepted={onAccepted} row={row()} venue={venue()} open />, [quoteMock()]);
    await press(labels.acceptCta);
    expect(onAccepted).not.toHaveBeenCalled();
  });
});
