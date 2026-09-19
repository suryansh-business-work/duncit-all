import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Route, useParams } from 'react-router';
import { formatDateTime, setAmbientDateSettings } from '@duncit/app-settings';
import UserRefundLogsPage from '../../src/pages/finance/user-refund-logs-page';
import { renderWithProviders } from '../testkit';
import { resetTableControls } from './mocks/table';
import {
  makePartialRefund,
  makeUserRefund,
  userRefundsTableErrorMock,
  userRefundsTableMock,
} from '../mocks/user-refund-logs.mock';

/** Stands in for the payment audit page, echoing the payment it was opened for. */
function PaymentProbe() {
  const { id } = useParams();
  return <div data-testid="payment-probe">{id}</div>;
}

const cellTexts = (field: string) => screen.getAllByTestId(`cell-${field}`).map((cell) => cell.textContent);

beforeEach(() => {
  resetTableControls();
});

afterEach(() => {
  vi.useRealTimers();
  // Back to the shared fallback pattern for every other suite.
  setAmbientDateSettings({});
});

describe('UserRefundLogsPage', () => {
  it('lists full and part refunds with their amounts, reasons and who set them off', async () => {
    renderWithProviders(<UserRefundLogsPage />, {
      mocks: [userRefundsTableMock([makeUserRefund(), makePartialRefund()])],
    });

    expect(screen.getByRole('heading', { name: 'User Refund Logs' })).toBeInTheDocument();
    expect(await screen.findByText('Riya Sharma')).toBeInTheDocument();
    expect(screen.getByText('aman@duncit.com')).toBeInTheDocument();

    expect(cellTexts('refunded_at')).toEqual([
      formatDateTime('2026-09-03T08:15:00.000Z'),
      formatDateTime('2026-09-03T08:15:00.000Z'),
    ]);
    // A payment with no capture time reads as a dash, not "Invalid Date".
    expect(cellTexts('paid_at')).toEqual([formatDateTime('2026-09-01T10:00:00.000Z'), '—']);
    expect(cellTexts('refund_amount')).toEqual(['₹1000.00', '₹500.00']);
    expect(cellTexts('total')).toEqual(['₹1000.00', '₹1000.00']);
    expect(cellTexts('partial')).toEqual(['Full', 'Part']);
    expect(cellTexts('refund_reason')).toEqual(['Duplicate charge', '—']);
    expect(cellTexts('refund_initiated_by')).toEqual(['Finance console', 'SYSTEM']);
    expect(cellTexts('status')).toEqual(['REFUNDED', 'SUCCESS']);
    expect(cellTexts('payment_id')).toEqual(['DUN-PAY-4821INV-2026-0042', 'DUN-PAY-4822']);

    // Only a part refund explains itself.
    expect(screen.getByLabelText(/Only some of the seats came back/)).toHaveTextContent('Part');
  });

  it('keeps the log current by re-reading it every 30 seconds', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    renderWithProviders(<UserRefundLogsPage />, {
      mocks: [userRefundsTableMock([makeUserRefund()], 1), userRefundsTableMock([makeUserRefund(), makePartialRefund()])],
    });
    expect(await screen.findByText('Riya Sharma')).toBeInTheDocument();
    expect(screen.queryByText('Aman Verma')).not.toBeInTheDocument();

    vi.advanceTimersByTime(30_000);
    expect(await screen.findByText('Aman Verma')).toBeInTheDocument();
  });

  it('opens the payment a refund reversed', async () => {
    renderWithProviders(<UserRefundLogsPage />, {
      path: '/user-refund-logs',
      entry: '/user-refund-logs',
      mocks: [userRefundsTableMock([makeUserRefund()])],
      extra: <Route path="/payment-logs/:id" element={<PaymentProbe />} />,
    });
    expect(await screen.findByText('Riya Sharma')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('row-open'));
    expect(screen.getByTestId('payment-probe')).toHaveTextContent('pay_doc_1');
  });

  it('dashes the dates when the admin date pattern cannot be rendered', async () => {
    // An admin-entered pattern with a token date-fns rejects makes every formatter answer ''.
    setAmbientDateSettings({ dateFormat: 'dd j yyyy' });
    renderWithProviders(<UserRefundLogsPage />, { mocks: [userRefundsTableMock([makeUserRefund()])] });
    expect(await screen.findByText('Riya Sharma')).toBeInTheDocument();
    expect(cellTexts('refunded_at')).toEqual(['—']);
    expect(cellTexts('created_at')).toEqual(['—']);
  });

  it('shows the empty state and a failed read', async () => {
    const { unmount } = renderWithProviders(<UserRefundLogsPage />, { mocks: [userRefundsTableMock([])] });
    expect(await screen.findByText('No refunds have been processed yet.')).toBeInTheDocument();
    unmount();

    renderWithProviders(<UserRefundLogsPage />, { mocks: [userRefundsTableErrorMock()] });
    expect(await screen.findByTestId('table-error')).toHaveTextContent('refund log unavailable');
  });
});
