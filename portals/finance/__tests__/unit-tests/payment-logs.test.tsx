import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { downloadBase64File } from '@duncit/utils';
import PaymentLogsPage from '../../src/pages/finance/PaymentLogsPage';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  invoicePdfMock,
  makePayment,
  paymentFailed,
  paymentSuccess,
  paymentsListMock,
  paymentsTableMock,
  refundPaymentMock,
} from '../mocks/payment-logs.mock';

// The real downloadBase64File builds an <a> and clicks it, which jsdom can't
// navigate — stub only that helper, keep the rest of @duncit/utils real.
vi.mock('@duncit/utils', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, downloadBase64File: vi.fn() };
});

const listItems = [paymentSuccess(), makePayment({ id: 'x', status: 'PENDING' })];

const enabledButtonFor = (iconTestId: string) =>
  screen
    .getAllByTestId(iconTestId)
    .map((i) => i.closest('button') as HTMLButtonElement)
    .find((b) => !b.disabled)!;

const RICH_Q = {
  search: 'txn',
  filters: [{ field: 'status', op: 'eq', value: 'SUCCESS' }],
  page: 1,
  pageSize: 25,
  sortBy: undefined,
  sortDir: 'asc' as const,
};

beforeEach(() => {
  resetTableControls();
  (downloadBase64File as unknown as { mockClear: () => void }).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('PaymentLogsPage', () => {
  it('renders totals, rows, downloads an invoice and polls', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    tableControls.queries = [tableControls.queries[0], RICH_Q];
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [paymentsListMock(listItems), paymentsTableMock([paymentSuccess(), paymentFailed()]), invoicePdfMock()],
    });

    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    expect(screen.getByText('Successful Payments')).toBeInTheDocument();

    fireEvent.click(enabledButtonFor('DownloadIcon'));
    await waitFor(() => expect(downloadBase64File).toHaveBeenCalled());
    vi.advanceTimersByTime(30000);
  });

  it('shows an error when the invoice pdf is missing', async () => {
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [paymentsListMock(listItems), paymentsTableMock([paymentSuccess()]), invoicePdfMock(null)],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    fireEvent.click(enabledButtonFor('DownloadIcon'));
    expect(await screen.findByText('Invoice not available')).toBeInTheDocument();
    const alert = screen.getByText('Invoice not available').closest('.MuiAlert-root') as HTMLElement;
    fireEvent.click(within(alert).getByRole('button'));
  });

  it('refunds a successful payment', async () => {
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [
        paymentsListMock(listItems),
        paymentsTableMock([paymentSuccess(), paymentFailed()]),
        refundPaymentMock(),
      ],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    fireEvent.click(enabledButtonFor('UndoIcon'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/reason/i), { target: { value: 'duplicate' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm refund/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('surfaces a refund error', async () => {
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [paymentsListMock(listItems), paymentsTableMock([paymentSuccess()]), refundPaymentMock({ fail: true })],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    fireEvent.click(enabledButtonFor('UndoIcon'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm refund/i }));
    expect(await within(dialog).findByText('refund failed')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
  });

  it('renders with no payments data (empty totals)', async () => {
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [paymentsListMock(null), paymentsTableMock([])],
    });
    await waitFor(() => expect(screen.getByText('No payments yet.')).toBeInTheDocument());
    expect(screen.getByText('Successful Payments')).toBeInTheDocument();
  });

  it('shows the refund loading label', async () => {
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [
        paymentsListMock(listItems),
        paymentsTableMock([paymentSuccess()]),
        refundPaymentMock({ delay: 60_000 }),
      ],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    fireEvent.click(enabledButtonFor('UndoIcon'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm refund/i }));
    expect(await screen.findByRole('button', { name: /refunding/i })).toBeDisabled();
  });
});
