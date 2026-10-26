/**
 * Finance > Pod Shop / Ecomm > Order Refunds. Read-only by design: it accounts
 * for refunds raised elsewhere, for ONE shop, and opens the payment each one
 * reverses.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useParams } from 'react-router';
import OrderRefundsPage from '../../src/pages/finance/order-refunds-page';
import { resetTableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  makeOrderRefund,
  makeOrderRefundSummary,
  orderRefundsErrorMock,
  orderRefundsNoPageMock,
  orderRefundsTableMock,
} from '../mocks/order-refunds.mock';

function PaymentProbe() {
  const { id } = useParams();
  return <div data-testid="payment-probe">{id}</div>;
}

const renderPage = (shop: 'POD_SHOP' | 'ECOMM', mocks: Parameters<typeof renderWithProviders>[1]['mocks']) =>
  renderWithProviders(<OrderRefundsPage shop={shop} />, {
    mocks,
    extra: <Route path="/payment-logs/:id" element={<PaymentProbe />} />,
  });

const strip = () => within(screen.getByTestId('finance-order-refunds-totals'));

beforeEach(() => {
  resetTableControls();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('OrderRefundsPage', () => {
  it('titles the Pod Shop page and asks the server for that shop only', async () => {
    const calls: Record<string, unknown>[] = [];
    renderPage('POD_SHOP', [orderRefundsTableMock([makeOrderRefund()], makeOrderRefundSummary(), (v) => calls.push(v))]);

    expect(screen.getByRole('heading', { name: 'Pod Shop — Order Refunds' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'One row per Pod Shop refund: a cancelled order, or an item sent back. Pet-store refunds are never listed here.',
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0]).toMatchObject({ shop: 'POD_SHOP' });
  });

  it('titles the Ecomm page and asks the server for the pet store only, never mixing the two', async () => {
    const calls: Record<string, unknown>[] = [];
    renderPage('ECOMM', [orderRefundsTableMock([makeOrderRefund()], makeOrderRefundSummary(), (v) => calls.push(v))]);

    expect(screen.getByRole('heading', { name: 'Ecomm (Pet Store) — Order Refunds' })).toBeInTheDocument();
    expect(screen.getByText(/One row per pet-store refund/)).toBeInTheDocument();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0]).toMatchObject({ shop: 'ECOMM' });
    expect(calls[0]).not.toMatchObject({ shop: 'POD_SHOP' });
  });

  it('prints the server totals exactly, and where the money goes', async () => {
    renderPage('POD_SHOP', [
      orderRefundsTableMock(
        [makeOrderRefund()],
        makeOrderRefundSummary({ count: 3, cash_total: 2500.5, coins_total: 400, manual_payout_total: 1000 }),
      ),
    ]);

    await waitFor(() => expect(strip().getByText('₹2500.50')).toBeInTheDocument());
    expect(strip().getByText('Refunds').nextElementSibling).toHaveTextContent('3');
    expect(strip().getByText('Refunded to original payment').nextElementSibling).toHaveTextContent('₹2500.50');
    expect(strip().getByText('Duncit Coins refunded').nextElementSibling).toHaveTextContent('400');
    expect(strip().getByText('Manual payout needed').nextElementSibling).toHaveTextContent('₹1000.00');
    expect(
      screen.getByTestId('finance-order-refunds-destination-hint'),
    ).toHaveTextContent(
      "The amount that was paid goes back to the original payment method; the coins that were redeemed go back to the buyer's Duncit Coin wallet.",
    );
  });

  it('lists each refund with its order, buyer and amounts', async () => {
    renderPage('POD_SHOP', [orderRefundsTableMock([makeOrderRefund(), makeOrderRefund({ id: 'r2', ref_no: 'ORD-1002' })])]);

    expect(await screen.findByText('ORD-1002')).toBeInTheDocument();
    expect(screen.getAllByTestId('table-row')).toHaveLength(2);
    expect(within(screen.getAllByTestId('table-row')[0]).getByTestId('cell-refund_value')).toHaveTextContent('₹1250.00');
  });

  it('opens the payment a refund reverses', async () => {
    renderPage('POD_SHOP', [orderRefundsTableMock([makeOrderRefund({ payment_doc_id: 'pay-doc-9' })])]);

    fireEvent.click(await screen.findByTestId('row-open'));

    expect(await screen.findByTestId('payment-probe')).toHaveTextContent('pay-doc-9');
  });

  it('opens nothing for a refund whose payment no longer exists', async () => {
    renderPage('ECOMM', [orderRefundsTableMock([makeOrderRefund({ payment_doc_id: null })])]);

    fireEvent.click(await screen.findByTestId('row-open'));

    expect(screen.queryByTestId('payment-probe')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ecomm (Pet Store) — Order Refunds' })).toBeInTheDocument();
  });

  it('says there are no refunds yet, with zeroed totals, when the shop has none', async () => {
    renderPage('POD_SHOP', [
      orderRefundsTableMock([], makeOrderRefundSummary({ count: 0, cash_total: 0, coins_total: 0, manual_payout_total: 0 })),
    ]);

    expect(await screen.findByText('No order refunds yet.')).toBeInTheDocument();
    expect(strip().getByText('Refunds').nextElementSibling).toHaveTextContent('0');
    expect(strip().getByText('Refunded to original payment').nextElementSibling).toHaveTextContent('₹0.00');
  });

  it('shows an empty list and zeroed totals when the answer carries no page', async () => {
    renderPage('POD_SHOP', [orderRefundsNoPageMock()]);

    expect(await screen.findByText('No order refunds yet.')).toBeInTheDocument();
    expect(strip().getByText('Refunds').nextElementSibling).toHaveTextContent('0');
    expect(strip().getByText('Refunded to original payment').nextElementSibling).toHaveTextContent('₹0.00');
  });

  it('shows why the list could not be loaded, and keeps zeroed totals', async () => {
    renderPage('POD_SHOP', [orderRefundsErrorMock('Refund ledger unavailable')]);

    expect(await screen.findByTestId('table-error')).toHaveTextContent('Refund ledger unavailable');
    expect(strip().getByText('Refunds').nextElementSibling).toHaveTextContent('0');
  });

  it('reloads the list every 30 seconds so refunds raised elsewhere appear without a reload', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    let calls = 0;
    renderPage('POD_SHOP', [orderRefundsTableMock([makeOrderRefund()], makeOrderRefundSummary(), () => (calls += 1))]);
    await waitFor(() => expect(calls).toBe(1));

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await waitFor(() => expect(calls).toBe(2));
  });
});
