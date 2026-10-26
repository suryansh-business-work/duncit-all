/**
 * Finance > Round Offs: every payment whose bill was rounded up to a whole
 * rupee. Read-only — the round-off is fixed when the payment is priced; this
 * page only accounts for it, and opens the payment it belongs to.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useParams } from 'react-router';
import { formatDateTime } from '@duncit/app-settings';
import RoundOffsPage from '../../src/pages/finance/round-offs-page';
import { resetTableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  makeRoundOff,
  makeRoundOffSummary,
  roundOffsNoPageMock,
  roundOffsTableMock,
} from '../mocks/order-refunds.mock';

function PaymentProbe() {
  const { id } = useParams();
  return <div data-testid="payment-probe">{id}</div>;
}

const renderPage = (mocks: Parameters<typeof renderWithProviders>[1]['mocks']) =>
  renderWithProviders(<RoundOffsPage />, {
    mocks,
    extra: <Route path="/payment-logs/:id" element={<PaymentProbe />} />,
  });

const strip = () => within(screen.getByTestId('finance-round-offs-totals'));

beforeEach(() => {
  resetTableControls();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('RoundOffsPage', () => {
  it('prints the server totals exactly, with what each one means', async () => {
    renderPage([roundOffsTableMock([makeRoundOff()], makeRoundOffSummary({ count: 5, round_off_total: 2.35, collected_round_off_total: 1.1 }))]);

    expect(screen.getByRole('heading', { name: 'Round Offs' })).toBeInTheDocument();
    await waitFor(() => expect(strip().getByText('₹2.35')).toBeInTheDocument());
    expect(strip().getByText('Payments rounded').nextElementSibling).toHaveTextContent('5');
    expect(strip().getByText('Round off added').nextElementSibling).toHaveTextContent('₹2.35');
    expect(strip().getByText('₹1.10')).toBeInTheDocument();
  });

  it('lists each rounded payment with its source, bill before rounding, round off and what was charged', async () => {
    renderPage([
      roundOffsTableMock([
        makeRoundOff(),
        makeRoundOff({ id: 'p2', payment_id: 'DUN-PAY-9', source: 'ECOMM', bill_amount: 249.2, round_off: 0.8, total: 250 }),
      ]),
    ]);

    await screen.findByText('Ecomm (pet store)');
    const [podBooking, ecomm] = screen.getAllByTestId('table-row');
    expect(within(podBooking).getByText('Pod booking')).toBeInTheDocument();
    expect(within(podBooking).getByText('₹999.60')).toBeInTheDocument();
    expect(within(podBooking).getByText('₹0.40')).toBeInTheDocument();
    expect(within(podBooking).getByText('₹1000.00')).toBeInTheDocument();
    expect(within(ecomm).getByText('₹249.20')).toBeInTheDocument();
    expect(within(ecomm).getByText('₹0.80')).toBeInTheDocument();
    expect(within(ecomm).getByText('₹250.00')).toBeInTheDocument();
  });

  it('names every source the server can classify a payment under', async () => {
    renderPage([
      roundOffsTableMock([
        makeRoundOff({ id: 'a', source: 'POD_BOOKING' }),
        makeRoundOff({ id: 'b', source: 'POD_SHOP' }),
        makeRoundOff({ id: 'c', source: 'ECOMM' }),
        makeRoundOff({ id: 'd', source: 'OTHER' }),
      ]),
    ]);

    await screen.findByText('Gift card / other');
    const sources = screen.getAllByTestId('cell-source').map((cell) => cell.textContent);
    expect(sources).toEqual(['Pod booking', 'Pod Shop cart', 'Ecomm (pet store)', 'Gift card / other']);
  });

  it('shows when it was paid, and a dash for a payment never paid or with an unreadable date', async () => {
    const paidAt = '2026-09-01T10:00:00.000Z';
    renderPage([
      roundOffsTableMock([
        makeRoundOff({ id: 'a', paid_at: paidAt }),
        makeRoundOff({ id: 'b', paid_at: null }),
        makeRoundOff({ id: 'c', paid_at: 'not a date' }),
      ]),
    ]);

    await waitFor(() => expect(screen.getAllByTestId('cell-paid_at')).toHaveLength(3));
    const paid = screen.getAllByTestId('cell-paid_at').map((cell) => cell.textContent);
    expect(paid).toEqual([formatDateTime(paidAt), '—', '—']);
    expect(paid[0]).not.toBe('—');
  });

  it('opens the payment a round-off belongs to', async () => {
    renderPage([roundOffsTableMock([makeRoundOff({ id: 'pay-doc-3' })])]);

    fireEvent.click(await screen.findByTestId('row-open'));

    expect(await screen.findByTestId('payment-probe')).toHaveTextContent('pay-doc-3');
  });

  it('says no payment has needed rounding when there are none', async () => {
    renderPage([roundOffsTableMock([], makeRoundOffSummary({ count: 0, round_off_total: 0, collected_round_off_total: 0 }))]);

    expect(await screen.findByText('No payment has needed rounding yet.')).toBeInTheDocument();
    expect(strip().getByText('Payments rounded').nextElementSibling).toHaveTextContent('0');
    expect(strip().getByText('Round off added').nextElementSibling).toHaveTextContent('₹0.00');
  });

  it('shows an empty list and zeroed totals when the answer carries no page', async () => {
    renderPage([roundOffsNoPageMock()]);

    expect(await screen.findByText('No payment has needed rounding yet.')).toBeInTheDocument();
    expect(strip().getByText('Payments rounded').nextElementSibling).toHaveTextContent('0');
  });

  it('reloads the list every 30 seconds, the same live refresh Payment Logs runs', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    let calls = 0;
    renderPage([roundOffsTableMock([makeRoundOff()], makeRoundOffSummary(), () => (calls += 1))]);
    await waitFor(() => expect(calls).toBe(1));

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await waitFor(() => expect(calls).toBe(2));
  });
});
