import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import SettlementPreview from '../SettlementPreview';
import { POD_SETTLEMENT_PREVIEW } from '../../queries';
import { renderWithProviders } from '../../../../__tests__/testkit';

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
        currency_symbol: '₹',
        collected_total: 1000,
        has_venue: true,
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
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} hostUserId="u1" />, {
      mocks: [previewMock()],
    });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the waterfall once the preview resolves', async () => {
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} hostUserId="u1" />, {
      mocks: [previewMock()],
    });
    expect(await screen.findByText(/customer paid/i)).toBeInTheDocument();
    expect(screen.getByText(/credited to the beneficiary wallets/i)).toBeInTheDocument();
  });

  it('sends host_user_id as null rather than an empty string', async () => {
    let sentVariables: unknown;
    const mock: MockedResponse = {
      request: { query: POD_SETTLEMENT_PREVIEW, variables: (variables) => {
        sentVariables = variables;
        return true;
      } },
      result: { data: { podSettlementPreview: { __typename: 'PodSettlementPreview', currency_symbol: '₹', collected_total: 1000, has_venue: false, waterfall } } },
    };
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} hostUserId="" />, {
      mocks: [mock],
    });
    await screen.findByText(/customer paid/i);
    expect(sentVariables).toMatchObject({ host_user_id: null });
  });

  it('states the GraphQL error reason rather than a generic message', async () => {
    const mock: MockedResponse = {
      request: { query: POD_SETTLEMENT_PREVIEW, variables: () => true },
      result: {
        errors: [{ message: 'Pod is not ready for settlement' } as never],
      },
    };
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} hostUserId="u1" />, {
      mocks: [mock],
    });
    expect(await screen.findByText('Pod is not ready for settlement')).toBeInTheDocument();
  });

  it('states a network-error message when the query has no GraphQL errors of its own', async () => {
    const mock: MockedResponse = {
      request: { query: POD_SETTLEMENT_PREVIEW, variables: () => true },
      error: new Error('offline'),
    };
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} hostUserId="u1" />, {
      mocks: [mock],
    });
    expect(await screen.findByText(/offline/)).toBeInTheDocument();
  });

  it('falls back to a generic message when the query settles with neither data nor an error', async () => {
    const mock: MockedResponse = {
      request: { query: POD_SETTLEMENT_PREVIEW, variables: () => true },
      result: { data: { podSettlementPreview: null } },
    };
    renderWithProviders(<SettlementPreview podId="pod-1" venueBillAmount={1500} hostUserId="u1" />, {
      mocks: [mock],
    });
    expect(await screen.findByText('Preview unavailable.')).toBeInTheDocument();
  });

  it('clears the previous debounce timer when the venue bill amount changes again', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const tree = (amount: number) => (
      <MockedProvider mocks={[previewMock()]}>
        <SettlementPreview podId="pod-1" venueBillAmount={amount} hostUserId="u1" />
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
            waterfall,
          },
        },
      },
    };
    const tree = (amount: number) => (
      <MockedProvider mocks={[mock]}>
        <SettlementPreview podId="pod-1" venueBillAmount={amount} hostUserId="u1" />
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
