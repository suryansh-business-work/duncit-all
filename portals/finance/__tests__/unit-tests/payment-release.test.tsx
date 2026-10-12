import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Route, useParams } from 'react-router';
import PaymentReleasePage from '../../src/pages/finance/PaymentReleasePage';
import PaymentReleaseDetailPage from '../../src/pages/finance/payment-release-page/detail/PaymentReleaseDetailPage';
import ReleaseBreakdownLines from '../../src/pages/finance/payment-release-page/payment-release-review/ReleaseBreakdownLines';
import { ReleaseKindChip } from '../../src/pages/finance/payment-release-page/ReleaseStatusChip';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  makeBreakdownV1,
  makeBreakdownV2,
  makePodPaymentRelease,
  podCoinTotalsMock,
  podPaymentReleaseMock,
  publicFinanceSettingsMock,
  publicFinanceSettingsNullMock,
} from '../mocks/payment-release.mock';

// The review of a single payout, "Approve all payouts" and everything else one
// request shows live on its own page — see payment-release-detail.test.tsx.

beforeEach(() => {
  resetTableControls();
});

describe('ReleaseKindChip', () => {
  it('labels both kinds', () => {
    const { rerender } = renderWithProviders(<ReleaseKindChip kind="VENUE_BILLING" />);
    expect(screen.getByText('Venue Billing')).toBeInTheDocument();
    rerender(<ReleaseKindChip kind="HOST_PAYMENT" />);
    expect(screen.getByText('Host Payment')).toBeInTheDocument();
  });

  it('labels the club-admin cut and an e-commerce brand payout', () => {
    const { rerender } = renderWithProviders(<ReleaseKindChip kind="CLUB_ADMIN" />);
    expect(screen.getByText('Club Admin')).toBeInTheDocument();
    rerender(<ReleaseKindChip kind="ECOMM_PAYMENT" />);
    expect(screen.getByText('E-Commerce Brand')).toBeInTheDocument();
  });
});

describe('ReleaseBreakdownLines', () => {
  it('returns null when there is no breakdown', () => {
    const { container } = renderWithProviders(<ReleaseBreakdownLines request={{ breakdown: null }} />, {
      mocks: [publicFinanceSettingsMock()],
    });
    expect(container.querySelector('[data-testid]')).toBeNull();
  });

  it('renders the v2 host waterfall and the v1 legacy snapshot', () => {
    renderWithProviders(<ReleaseBreakdownLines request={{ kind: 'HOST_PAYMENT', breakdown: makeBreakdownV2() }} />, {
      mocks: [publicFinanceSettingsMock()],
    });
    expect(screen.getByText('Host amount (pool remainder)')).toBeInTheDocument();
    renderWithProviders(<ReleaseBreakdownLines request={{ kind: 'VENUE_BILLING', breakdown: makeBreakdownV1() }} />, {
      mocks: [publicFinanceSettingsMock()],
    });
    expect(screen.getByText('Venue bill')).toBeInTheDocument();
  });

  it('handles zero percentages and a missing currency symbol', () => {
    const zeroV2 = makeBreakdownV2({ gst_pct: 0, gst_amount: 0, platform_fee_pct: 0, platform_fee_amount: 0, pool_amount: 1000, share_amount: 500, commission_pct: 0, commission_amount: 0, payout_amount: 500, duncit_revenue: 0 });
    renderWithProviders(<ReleaseBreakdownLines request={{ kind: 'VENUE_BILLING', breakdown: zeroV2 }} />, {
      mocks: [publicFinanceSettingsNullMock()],
    });
    // The venue's side is no longer only the slot: a final bill can replace or add to it.
    expect(screen.getByText('Venue amount (slot price and/or final bill)')).toBeInTheDocument();
    const zeroV1 = makeBreakdownV1({ gst_pct: 0, gst_amount: 0, duncit_pct: 0, duncit_amount: 0, payout_pct: 0, payout_amount: 500 });
    renderWithProviders(<ReleaseBreakdownLines request={{ kind: 'HOST_PAYMENT', breakdown: zeroV1 }} />, {
      mocks: [publicFinanceSettingsNullMock()],
    });
    expect(screen.getByText('Venue bill')).toBeInTheDocument();
  });

  it('shows the attendance a host payout settled on, and the pod’s coin and tier notes', async () => {
    const breakdown = makeBreakdownV2({ booked_seats: 10, attended_seats: 8, attended_total: 800 });
    renderWithProviders(<ReleaseBreakdownLines request={{ kind: 'HOST_PAYMENT', pod_id: 'pod1', breakdown }} />, {
      mocks: [
        publicFinanceSettingsMock(),
        podCoinTotalsMock({ coins_redeemed_total: 50, coins_earned_total: 12, ticket_discount_total: 120 }),
      ],
    });
    expect(screen.getByText('Attendance at completion')).toBeInTheDocument();
    expect(screen.getByText('8 of 10 seats')).toBeInTheDocument();
    expect(screen.getByText('Settled on (attended seats)')).toBeInTheDocument();
    expect(await screen.findByText(/^Duncit Coins on this pod: 50 spent by buyers .* 12 earned back\.$/)).toBeInTheDocument();
    expect(
      await screen.findByText('₹120.00 in multi-ticket discounts is already off the collected total.'),
    ).toBeInTheDocument();
  });

  it('reads a pod nobody attended as zero of its booked seats', () => {
    const breakdown = makeBreakdownV2({ booked_seats: 4, attended_seats: 0, attended_total: 0 });
    renderWithProviders(<ReleaseBreakdownLines request={{ kind: 'CLUB_ADMIN', breakdown }} />, {
      mocks: [publicFinanceSettingsMock()],
    });
    expect(screen.getByText('0 of 4 seats')).toBeInTheDocument();
    expect(screen.getByText('Club admin cut (off the pool)')).toBeInTheDocument();
  });
});

describe('PaymentReleasePage', () => {
  /** Where the page lands when a request is opened — the route App.tsx mounts the detail page on. */
  function OpenedRequest() {
    const { requestId } = useParams<{ requestId: string }>();
    return <div data-testid="opened-request">{requestId}</div>;
  }

  const mount = (mocks = [publicFinanceSettingsMock()]) =>
    renderWithProviders(<PaymentReleasePage />, {
      path: '/payment-release',
      entry: '/payment-release',
      mocks,
      extra: <Route path="/payment-release/:requestId" element={<OpenedRequest />} />,
    });

  it('says what the page is: one row per completed pod', async () => {
    mount();
    expect(screen.getByRole('heading', { level: 1, name: 'Payment Release' })).toBeInTheDocument();
    expect(
      screen.getByText('One row per completed pod — open a pod to review and approve its payouts.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('No payment release requests found.')).toBeInTheDocument();
  });

  it('lists one row per pod with its payouts, total, proof and status', async () => {
    tableControls.rows = [
      makePodPaymentRelease(),
      makePodPaymentRelease({
        id: 'batch-2',
        pod_id: 'pod2',
        pod_title: 'Chess',
        status: 'APPROVED',
        total_requested: 0,
        release_count: 1,
        kinds: ['ECOMM_PAYMENT'],
        has_bill: false,
        media_count: 0,
      }),
    ];
    mount();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    const [yoga, chess] = screen.getAllByTestId('table-row');

    expect(within(yoga).getByRole('link', { name: 'Yoga' })).toHaveAttribute('href', '/payment-release/batch-1');
    const kinds = within(yoga).getByTestId('cell-kinds');
    expect(within(kinds).getByText('Venue Billing')).toBeInTheDocument();
    expect(within(kinds).getByText('Host Payment')).toBeInTheDocument();
    expect(within(kinds).getByText('Club Admin')).toBeInTheDocument();
    await waitFor(() => expect(within(yoga).getByTestId('cell-total_requested')).toHaveTextContent('₹1040.50'));
    expect(within(yoga).getByTestId('cell-proof')).toHaveTextContent('Bill · Media: 3');
    expect(within(yoga).getByTestId('cell-status')).toHaveTextContent('PENDING');

    // A request with neither a bill nor media has no proof to name.
    expect(within(chess).getByTestId('cell-kinds')).toHaveTextContent('E-Commerce Brand');
    expect(within(chess).getByTestId('cell-total_requested')).toHaveTextContent('₹0.00');
    expect(within(chess).getByTestId('cell-proof')).toBeEmptyDOMElement();
    expect(within(chess).getByTestId('cell-status')).toHaveTextContent('APPROVED');
    // Every request can be opened — an approved one is still read, not only a pending one.
    expect(within(chess).getByRole('button', { name: 'Review' })).toBeEnabled();
  });

  it('names a bill with no media, and media with no bill', async () => {
    tableControls.rows = [
      makePodPaymentRelease({ media_count: 0 }),
      makePodPaymentRelease({ id: 'batch-2', has_bill: false, media_count: 1 }),
    ];
    mount();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    const [billOnly, mediaOnly] = screen.getAllByTestId('table-row');
    expect(within(billOnly).getByTestId('cell-proof')).toHaveTextContent(/^Bill$/);
    expect(within(mediaOnly).getByTestId('cell-proof')).toHaveTextContent(/^Media: 1$/);
  });

  it('opens the request from its Review button', async () => {
    tableControls.rows = [makePodPaymentRelease()];
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    expect(await screen.findByTestId('opened-request')).toHaveTextContent('batch-1');
  });

  it('opens the request from a click on its row', async () => {
    // An id that is not URL-safe still has to arrive whole.
    tableControls.rows = [makePodPaymentRelease({ id: 'pod 1/legacy' })];
    mount();
    fireEvent.click(await screen.findByTestId('row-open'));
    expect(await screen.findByTestId('opened-request')).toHaveTextContent('pod 1/legacy');
  });

  it('shows the amounts without a symbol when Finance settings have none', async () => {
    tableControls.rows = [makePodPaymentRelease()];
    mount([publicFinanceSettingsNullMock()]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-total_requested')).toHaveTextContent(/^1040\.50$/);
  });
});

// The page's own guard, seen through the stubbed QueryGuard — which, unlike the
// real one, hands control to the page even when there is nothing to show. The
// request's content is covered in payment-release-detail.test.tsx.
describe('PaymentReleaseDetailPage with no request to show', () => {
  it('draws no request body, and offers no approval, when the request is missing', async () => {
    const read = podPaymentReleaseMock(null);
    renderWithProviders(<PaymentReleaseDetailPage />, {
      path: '/payment-release/:requestId',
      entry: '/payment-release/batch-1',
      mocks: [read.mock],
    });
    await waitFor(() => expect(read.state.reads).toBe(1));
    await waitFor(() => expect(screen.queryByTestId('qg-loading')).not.toBeInTheDocument());
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('release-approve-all')).not.toBeInTheDocument();
  });
});
