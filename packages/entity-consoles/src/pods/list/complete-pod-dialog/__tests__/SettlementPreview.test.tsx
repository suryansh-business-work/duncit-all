import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import SettlementPreview from '../SettlementPreview';
import { POD_SETTLEMENT_PREVIEW } from '../../queries';
import { renderWithProviders } from '../../../../../__tests__/testkit';

const waterfall = {
  __typename: 'PodFinanceWaterfall',
  version: 2,
  amount: 1000,
  gst_pct: 18,
  gst_amount: 152.54,
  net_amount: 847.46,
  platform_fee_pct: 5,
  platform_fee_amount: 42.37,
  pool_amount: 805.09,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 300,
  venue_commission_pct: 10,
  venue_commission_amount: 30,
  venue_receives: 270,
  host_amount: 505.09,
  host_commission_pct: 10,
  host_commission_amount: 50.51,
  host_receives: 454.58,
  duncit_revenue: 122.88,
  host_earn_pct: 45.46,
};

const previewMock = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: POD_SETTLEMENT_PREVIEW, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      podSettlementPreview: {
        __typename: 'PodSettlementPreview',
        is_free: false,
        currency_symbol: '₹',
        collected_total: 1000,
        has_venue: true,
        attended_seats: 8,
        booked_seats: 10,
        // No bill entered: the venue's side is the ₹300 the slot was booked at.
        venue_bill: 0,
        venue_slot_price: 300,
        include_slot_price: false,
        // A booking made before offers: no extra charges, no minimum, no agreed terms.
        venue_extra_amount: 0,
        venue_min_guests: 0,
        venue_pax: 0,
        venue_agreed_model: null,
        venue_agreed_rate: null,
        waterfall,
        ...over,
      },
    },
  },
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SettlementPreview', () => {
  it('shows a spinner before the preview loads', () => {
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} venueExtraAmount={0} hostUserId="u1" />, {
      mocks: [previewMock()],
    });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the four-way split, host first, once the preview resolves', async () => {
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} venueExtraAmount={0} hostUserId="u1" />, {
      mocks: [previewMock()],
    });
    expect(await screen.findByRole('button', { name: 'Host Earning' })).toBeInTheDocument();
    // Host 454.58 · venue keeps 270 · Duncit & govt = GST 152.54 + fee 42.37
    // + host commission 50.51 + venue commission 30.
    expect(screen.getByText('₹454.58')).toBeInTheDocument();
    expect(screen.getByText('₹270.00')).toBeInTheDocument();
    expect(screen.getByText('₹275.42')).toBeInTheDocument();
    // Nothing is credited at completion any more — the note says who releases it.
    expect(
      screen.getByText('Payouts are credited to the beneficiary wallets once Finance approves the request.'),
    ).toBeInTheDocument();
  });

  const billLine = (key: string) => screen.getByTestId(`venue-bill-line-${key}`).textContent;

  it('states the slot price and that no bill was entered, on a venue pod', async () => {
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={0} venueExtraAmount={0} hostUserId="u1" />, {
      mocks: [previewMock()],
    });
    await screen.findByRole('button', { name: 'Host Earning' });
    expect(billLine('attendees')).toBe('Total attendees8 of 10 seats');
    expect(billLine('slot-price')).toBe('Agreed booking amount₹300.00');
    expect(billLine('final-bill')).toBe('Final bill uploadedNone');
    expect(billLine('venue-total')).toBe('Venue total₹300.00');
  });

  // The venue is paid the agreed amount plus the extra charges; the bill is the proof.
  it('lists the bill uploaded and the extra charges paid on top of the agreed amount', async () => {
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} venueExtraAmount={250} hostUserId="u1" />, {
      mocks: [
        previewMock({
          venue_bill: 1500,
          venue_extra_amount: 250,
          waterfall: { ...waterfall, venue_amount: 550 },
        }),
      ],
    });
    await screen.findByRole('button', { name: 'Host Earning' });
    expect(billLine('slot-price')).toBe('Agreed booking amount₹300.00');
    expect(billLine('final-bill')).toBe('Final bill uploaded₹1500.00');
    expect(billLine('extra')).toBe('Extra charges₹250.00');
    expect(billLine('venue-total')).toBe('Venue total₹550.00');
    expect(screen.queryByTestId('settlement-agreed-terms')).not.toBeInTheDocument();
  });

  // A per-guest booking is paid for the guests the server counted, never fewer than its minimum.
  it('states the agreed per-guest terms and the guests the venue is paid for', async () => {
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={0} venueExtraAmount={0} hostUserId="u1" />, {
      mocks: [
        previewMock({ venue_agreed_model: 'PER_GUEST', venue_agreed_rate: 300, venue_min_guests: 8, venue_pax: 9 }),
      ],
    });
    await screen.findByRole('button', { name: 'Host Earning' });
    expect(screen.getByTestId('settlement-agreed-terms').textContent).toBe('Agreed termsPer guest · ₹300 per guest');
    expect(billLine('paid-guests')).toBe('Guests the venue is paid for9 (at least 8)');
  });

  // A free venue is owed nothing: its terms read "Free venue", and the dialog is told so it asks for a bill only with extras.
  it('states a free venue as such and tells the dialog the venue was free', async () => {
    const onFreeVenue = vi.fn();
    renderWithProviders(
      <SettlementPreview podId="pod-1" venueBillAmount={0} venueExtraAmount={0} hostUserId="u1" onFreeVenue={onFreeVenue} />,
      { mocks: [previewMock({ venue_agreed_model: 'FREE', venue_agreed_rate: 0 })] },
    );
    await screen.findByRole('button', { name: 'Host Earning' });
    expect(screen.getByTestId('settlement-agreed-terms').textContent).toBe('Agreed termsFree venue');
    expect(onFreeVenue).toHaveBeenLastCalledWith(true);
    expect(onFreeVenue).toHaveBeenCalledWith(false);
  });

  it('states no agreed terms when the settlement carries a model but no rate', async () => {
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={0} venueExtraAmount={0} hostUserId="u1" />, {
      mocks: [previewMock({ venue_agreed_model: 'FLAT', venue_agreed_rate: null })],
    });
    await screen.findByRole('button', { name: 'Host Earning' });
    expect(screen.queryByTestId('settlement-agreed-terms')).not.toBeInTheDocument();
  });

  // A free pod moves no platform money, so not a single figure is drawn.
  it('heads a free pod "Free pod" and draws no split or bill', async () => {
    const zeros = Object.fromEntries(
      Object.entries(waterfall).map(([key, value]) => [key, typeof value === 'number' ? 0 : value]),
    );
    const { container } = renderWithProviders(
      <SettlementPreview podId="pod-1" venueBillAmount={0} venueExtraAmount={0} hostUserId="u1" />,
      {
        mocks: [
          previewMock({ is_free: true, collected_total: 0, has_venue: false, venue_slot_price: 0, waterfall: zeros }),
        ],
      },
    );
    expect(await screen.findByTestId('settlement-free-note')).toHaveTextContent(/Nobody pays to join a free pod/);
    expect(screen.getByTestId('settlement-free')).toHaveTextContent('Free pod');
    expect(screen.queryByRole('button', { name: 'Host Earning' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('venue-bill-summary')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('₹');
  });

  it('reads as free before the preview loads when the caller says the pod is free', () => {
    renderWithProviders(
      <SettlementPreview podId="pod-1" venueBillAmount={0} venueExtraAmount={0} hostUserId="u1" free />,
      { mocks: [previewMock()] },
    );
    expect(screen.getByTestId('settlement-free')).toHaveTextContent('Free pod');
  });

  it('has no venue bill to summarise on a pod with no venue behind it', async () => {
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={0} venueExtraAmount={0} hostUserId="u1" />, {
      mocks: [previewMock({ has_venue: false, venue_slot_price: 0 })],
    });
    await screen.findByRole('button', { name: 'Host Earning' });
    expect(screen.queryByTestId('venue-bill-summary')).not.toBeInTheDocument();
  });

  it('asks for the preview with the extra charges, and never with a slot-price choice', async () => {
    const sent: Record<string, unknown>[] = [];
    const mock: MockedResponse = {
      ...previewMock(),
      request: { query: POD_SETTLEMENT_PREVIEW, variables: (variables) => {
        sent.push(variables);
        return true;
      } },
    };
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} venueExtraAmount={250} hostUserId="u1" />, {
      mocks: [mock],
    });
    await screen.findByRole('button', { name: 'Host Earning' });
    expect(sent[0]).toEqual({
      pod_id: 'pod-1',
      venue_bill_amount: 1500,
      host_user_id: 'u1',
      venue_extra_amount: 250,
    });
  });

  it('sends host_user_id as null rather than an empty string', async () => {
    let sentVariables: unknown;
    const mock: MockedResponse = {
      request: { query: POD_SETTLEMENT_PREVIEW, variables: (variables) => {
        sentVariables = variables;
        return true;
      } },
      result: { data: { podSettlementPreview: { __typename: 'PodSettlementPreview', currency_symbol: '₹', collected_total: 1000, has_venue: false, attended_seats: 8, booked_seats: 10, venue_bill: 0, venue_slot_price: 0, include_slot_price: false, venue_extra_amount: 0, venue_min_guests: 0, venue_pax: 0, venue_agreed_model: null, venue_agreed_rate: null, waterfall } } },
    };
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} venueExtraAmount={0} hostUserId="" />, {
      mocks: [mock],
    });
    await screen.findByRole('button', { name: 'Host Earning' });
    expect(sentVariables).toMatchObject({ host_user_id: null });
  });

  it('states the GraphQL error reason rather than a generic message', async () => {
    const mock: MockedResponse = {
      request: { query: POD_SETTLEMENT_PREVIEW, variables: () => true },
      result: {
        errors: [{ message: 'Pod is not ready for settlement' } as never],
      },
    };
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} venueExtraAmount={0} hostUserId="u1" />, {
      mocks: [mock],
    });
    expect(await screen.findByText('Pod is not ready for settlement')).toBeInTheDocument();
  });

  it('states a network-error message when the query has no GraphQL errors of its own', async () => {
    const mock: MockedResponse = {
      request: { query: POD_SETTLEMENT_PREVIEW, variables: () => true },
      error: new Error('offline'),
    };
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} venueExtraAmount={0} hostUserId="u1" />, {
      mocks: [mock],
    });
    expect(await screen.findByText(/offline/)).toBeInTheDocument();
  });

  it('falls back to a generic message when the query settles with neither data nor an error', async () => {
    const mock: MockedResponse = {
      request: { query: POD_SETTLEMENT_PREVIEW, variables: () => true },
      result: { data: { podSettlementPreview: null } },
    };
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} venueExtraAmount={0} hostUserId="u1" />, {
      mocks: [mock],
    });
    expect(await screen.findByText('Preview unavailable.')).toBeInTheDocument();
  });

  it('clears the previous debounce timer when the venue bill amount changes again', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const tree = (amount: number) => (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[previewMock()]}>
        <SettlementPreview podId="pod-1" venueBillAmount={amount} venueExtraAmount={0} hostUserId="u1" />
      </MockedProvider>
    );
    const { rerender, unmount } = render(tree(1000));
    rerender(tree(2000));
    expect(clearSpy).toHaveBeenCalled();
    unmount();
    vi.useRealTimers();
  });

  it('re-queries with the debounced amount once the 350ms timer settles', async () => {
    vi.useFakeTimers();
    const seenAmounts: unknown[] = [];
    const mock: MockedResponse = {
      request: { query: POD_SETTLEMENT_PREVIEW, variables: (variables) => {
        seenAmounts.push(variables.venue_bill_amount);
        return true;
      } },
      maxUsageCount: Number.POSITIVE_INFINITY,
      result: {
        data: {
          podSettlementPreview: {
            __typename: 'PodSettlementPreview',
            currency_symbol: '₹',
            collected_total: 1000,
            has_venue: true,
            attended_seats: 8,
            booked_seats: 10,
            venue_bill: 0,
            venue_slot_price: 300,
            include_slot_price: false,
            venue_extra_amount: 0,
            venue_min_guests: 0,
            venue_pax: 0,
            venue_agreed_model: null,
            venue_agreed_rate: null,
            waterfall,
          },
        },
      },
    };
    const tree = (amount: number) => (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[mock]}>
        <SettlementPreview podId="pod-1" venueBillAmount={amount} venueExtraAmount={0} hostUserId="u1" />
      </MockedProvider>
    );
    const { rerender } = render(tree(1000));
    await act(() => vi.advanceTimersByTimeAsync(0));
    rerender(tree(2000));
    // Not yet — the 350ms debounce hasn't fired, so no second query went out.
    expect(seenAmounts).not.toContain(2000);
    await act(() => vi.advanceTimersByTimeAsync(350));
    vi.useRealTimers();
    expect(seenAmounts).toContain(2000);
  });
});
