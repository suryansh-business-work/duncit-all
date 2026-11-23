import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Route, useParams } from 'react-router';
import { downloadBase64File } from '@duncit/utils';
import PaymentLogsPage from '../../src/pages/finance/PaymentLogsPage';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  invoicePdfMock,
  makePayment,
  paymentFailed,
  paymentLogsPdfMock,
  paymentSuccess,
  paymentTotalsForStatusMock,
  paymentTotalsMock,
  paymentsTableMock,
  refundPaymentMock,
  shopPaymentsTableMock,
} from '../mocks/payment-logs.mock';

// The real downloadBase64File builds an <a> and clicks it, which jsdom can't
// navigate — stub only that helper, keep the rest of @duncit/utils real.
vi.mock('@duncit/utils', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, downloadBase64File: vi.fn() };
});

const listItems = [paymentSuccess(), makePayment({ id: 'x', status: 'PENDING' })];

/** Stands in for the audit page, echoing the payment it was opened for. */
function PaymentProbe() {
  const { id } = useParams();
  return <div data-testid="payment-probe">{id}</div>;
}

/** The figure under the "Successful Payments" caption. */
const successfulCount = () => screen.getByText('Successful Payments').nextElementSibling;

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
      mocks: [paymentTotalsMock(listItems), paymentsTableMock([paymentSuccess(), paymentFailed()]), invoicePdfMock()],
    });

    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    expect(screen.getByText('Successful Payments')).toBeInTheDocument();

    fireEvent.click(enabledButtonFor('DownloadIcon'));
    await waitFor(() => expect(downloadBase64File).toHaveBeenCalled());
    vi.advanceTimersByTime(30000);
  });

  it('shows an error when the invoice pdf is missing', async () => {
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [paymentTotalsMock(listItems), paymentsTableMock([paymentSuccess()]), invoicePdfMock(null)],
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
        paymentTotalsMock(listItems),
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
      mocks: [paymentTotalsMock(listItems), paymentsTableMock([paymentSuccess()]), refundPaymentMock({ fail: true })],
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
      mocks: [paymentTotalsMock(null), paymentsTableMock([])],
    });
    await waitFor(() => expect(screen.getByText('No payments yet.')).toBeInTheDocument());
    expect(screen.getByText('Successful Payments')).toBeInTheDocument();
  });

  it('opens a payment’s audit page from its row', async () => {
    renderWithProviders(<PaymentLogsPage />, {
      path: '/payment-logs',
      entry: '/payment-logs',
      mocks: [paymentTotalsMock(listItems), paymentsTableMock([paymentSuccess()])],
      extra: <Route path="/payment-logs/:id" element={<PaymentProbe />} />,
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('row-open'));
    expect(screen.getByTestId('payment-probe')).toHaveTextContent('p1');
  });

  it('narrows the KPI cards to a single status picked in the status filter', async () => {
    const [base] = tableControls.queries;
    tableControls.queries = [{ ...base, filters: [{ field: 'status', op: 'in', values: ['SUCCESS'] }] }];
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [
        paymentTotalsForStatusMock('SUCCESS', [paymentSuccess()]),
        paymentTotalsMock(listItems),
        paymentsTableMock([paymentSuccess()]),
      ],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    await waitFor(() => expect(successfulCount()).toHaveTextContent(/^1$/));
  });

  it('leaves the KPI cards unfiltered when several statuses are picked', async () => {
    const [base] = tableControls.queries;
    tableControls.queries = [{ ...base, filters: [{ field: 'status', op: 'in', values: ['SUCCESS', 'FAILED'] }] }];
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [
        paymentTotalsForStatusMock('SUCCESS', [paymentSuccess()]),
        paymentTotalsMock(listItems),
        paymentsTableMock([paymentSuccess(), paymentFailed()]),
      ],
    });
    await waitFor(() => expect(screen.getByText('Ravi')).toBeInTheDocument());
    await waitFor(() => expect(successfulCount()).toHaveTextContent(/^2$/));
  });

  it('shows the refund loading label', async () => {
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [
        paymentTotalsMock(listItems),
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

describe('PaymentLogsPage — what it says and what it shows', () => {
  it('says what the page shows and that a row opens the payment, under the title', async () => {
    renderWithProviders(<PaymentLogsPage />, { mocks: [paymentTotalsMock(listItems), paymentsTableMock([paymentSuccess()])] });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: 'Payment Logs' })).toBeInTheDocument();
    expect(screen.getByText(/click a row to open it/i)).toBeInTheDocument();
  });

  it("keeps a shop log's own explanation instead of the general one", async () => {
    renderWithProviders(<PaymentLogsPage shop="POD_SHOP" />, {
      mocks: [paymentTotalsMock(listItems), shopPaymentsTableMock([paymentSuccess()])],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    expect(screen.getByText(/payments that bought pod shop products/i)).toBeInTheDocument();
    expect(screen.queryByText(/click a row to open it/i)).not.toBeInTheDocument();
  });

  it("shows each payment's refund in plain words in its own column", async () => {
    const refunded = makePayment({ id: 'r1', user_name: 'Meera', status: 'REFUNDED', refund_status: 'SUCCEEDED' });
    const attention = makePayment({ id: 'r2', user_name: 'Kabir', status: 'REFUNDED', refund_status: 'RECONCILIATION_REQUIRED' });
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [paymentTotalsMock(listItems), paymentsTableMock([refunded, attention, paymentSuccess()])],
    });
    await waitFor(() => expect(screen.getByText('Meera')).toBeInTheDocument());
    const cells = screen.getAllByTestId('cell-refund_status').map((cell) => cell.textContent);
    expect(cells).toEqual(['Refunded', 'Refund needs attention', '—']);
  });
});

describe('PaymentLogsPage — Export PDF', () => {
  const exportButton = () => screen.getByTestId('finance-payments-export-pdf');
  const PDF_NAME = /^payment-logs-\d{4}-\d{2}-\d{2}\.pdf$/;

  it('asks for the table as it is now — its search, filters and sort — and downloads the file', async () => {
    tableControls.queries = [RICH_Q];
    const seen: Record<string, unknown>[] = [];
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [
        paymentTotalsMock(listItems),
        paymentsTableMock([paymentSuccess()]),
        paymentLogsPdfMock('JVBERi0=', { onVariables: (variables) => seen.push(variables) }),
      ],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    fireEvent.click(exportButton());

    await waitFor(() => expect(downloadBase64File).toHaveBeenCalledTimes(1));
    expect(downloadBase64File).toHaveBeenCalledWith('JVBERi0=', expect.stringMatching(PDF_NAME), 'application/pdf');
    const sent = seen.at(-1);
    expect(sent).toEqual({
      query: expect.objectContaining({
        search: 'txn',
        sort_dir: 'asc',
        filters: [{ field: 'status', op: 'eq', value: 'SUCCESS', values: null }],
      }),
    });
    // The all-payments log has no shop to narrow to.
    expect(sent).not.toHaveProperty('shop');
  });

  it("exports a shop's log through that shop's scope and names the file after the shop", async () => {
    const seen: Record<string, unknown>[] = [];
    renderWithProviders(<PaymentLogsPage shop="POD_SHOP" />, {
      mocks: [
        paymentTotalsMock(listItems),
        shopPaymentsTableMock([paymentSuccess()]),
        paymentLogsPdfMock('JVBERi0=', { onVariables: (variables) => seen.push(variables) }),
      ],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    fireEvent.click(exportButton());

    await waitFor(() => expect(downloadBase64File).toHaveBeenCalledTimes(1));
    expect(seen.at(-1)).toMatchObject({ shop: 'POD_SHOP' });
    expect(downloadBase64File).toHaveBeenCalledWith(
      'JVBERi0=',
      expect.stringMatching(/^pod-shop-payment-logs-\d{4}-\d{2}-\d{2}\.pdf$/),
      'application/pdf',
    );
  });

  it("shows the server's reason when the export fails, downloads nothing and can be tried again", async () => {
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [paymentTotalsMock(listItems), paymentsTableMock([paymentSuccess()]), paymentLogsPdfMock(null, { fail: true })],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    fireEvent.click(exportButton());

    expect(await screen.findByText('pdf export failed')).toBeInTheDocument();
    expect(downloadBase64File).not.toHaveBeenCalled();
    expect(exportButton()).toBeEnabled();
    // The alert can be dismissed.
    const alert = screen.getByText('pdf export failed').closest('.MuiAlert-root') as HTMLElement;
    fireEvent.click(within(alert).getByRole('button'));
    expect(screen.queryByText('pdf export failed')).not.toBeInTheDocument();
  });

  it('says so when the server answers with no file, instead of downloading an empty one', async () => {
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [paymentTotalsMock(listItems), paymentsTableMock([paymentSuccess()]), paymentLogsPdfMock(null)],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    fireEvent.click(exportButton());

    expect(await screen.findByText(/pdf could not be created/i)).toBeInTheDocument();
    expect(downloadBase64File).not.toHaveBeenCalled();
  });

  it('waits on the button while the PDF is being made, so one click makes one export', async () => {
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [paymentTotalsMock(listItems), paymentsTableMock([paymentSuccess()]), paymentLogsPdfMock('JVBERi0=', { delay: 60_000 })],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    fireEvent.click(exportButton());

    await waitFor(() => expect(exportButton()).toBeDisabled());
    expect(downloadBase64File).not.toHaveBeenCalled();
  });

  it('only exports: no refund dialog opens and no invoice is downloaded', async () => {
    renderWithProviders(<PaymentLogsPage />, {
      mocks: [paymentTotalsMock(listItems), paymentsTableMock([paymentSuccess()]), paymentLogsPdfMock('JVBERi0=')],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    fireEvent.click(exportButton());

    await waitFor(() => expect(downloadBase64File).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Riya')).toBeInTheDocument();
    expect(vi.mocked(downloadBase64File).mock.calls[0][1]).not.toMatch(/^invoice-/);
  });
});
