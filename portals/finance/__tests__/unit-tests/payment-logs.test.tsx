import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import PaymentLogsPage from '../../src/pages/finance/PaymentLogsPage';
import { INVOICE_PDF, PAYMENTS_TABLE } from '../../src/pages/finance/payment-logs-page/queries';
import { resetTableControls, tableControls } from './mocks/table';
import { renderUI } from './testkit';

vi.mock('@apollo/client', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn(), useApolloClient: vi.fn() };
});

// The real downloadBase64File builds an <a> and clicks it, which jsdom can't
// navigate — stub only that helper, keep the rest of @duncit/utils real.
vi.mock('@duncit/utils', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, downloadBase64File: vi.fn() };
});

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);
const mockedUseApolloClient = vi.mocked(useApolloClient);

const RICH_Q = {
  search: 'txn', filters: [{ field: 'status', op: 'eq', value: 'SUCCESS' }],
  page: 1, pageSize: 25, sortBy: undefined, sortDir: 'asc' as const,
};

const paySuccess = {
  id: 'p1', payment_id: 'pay_1', invoice_no: 'INV-1', user_name: 'Riya', user_email: 'r@x.com',
  description: 'Pod', subtotal: 100, platform_fee_amount: 5, gst_amount: 15, total: 120,
  currency_symbol: '₹', status: 'SUCCESS', gateway: 'razorpay', gateway_ref: 'gw', paid_at: '2024-01-01T00:00:00Z', created_at: '2024-01-01T00:00:00Z',
};
const payFailed = { ...paySuccess, id: 'p2', payment_id: 'pay_2', user_name: 'Ravi', invoice_no: null, status: 'FAILED', paid_at: null };

const listItems = [paySuccess, { ...paySuccess, id: 'x', status: 'PENDING' }];

const enabledButtonFor = (iconTestId: string) =>
  screen.getAllByTestId(iconTestId).map((i) => i.closest('button') as HTMLButtonElement).find((b) => !b.disabled)!;

const makeClient = (pdf: unknown = 'aGVsbG8=') => ({
  query: vi.fn(({ query }: any) => {
    if (query === INVOICE_PDF) return Promise.resolve({ data: { paymentInvoicePdfBase64: pdf } });
    if (query === PAYMENTS_TABLE) return Promise.resolve({ data: { paymentsTable: { rows: tableControls.rows, total: tableControls.rows.length } } });
    return Promise.resolve({ data: {} });
  }),
});

beforeEach(() => {
  mockedUseQuery.mockReset().mockReturnValue({ data: { payments: listItems }, refetch: vi.fn() } as any);
  mockedUseMutation.mockReset().mockReturnValue([vi.fn().mockResolvedValue({}), { loading: false }] as any);
  mockedUseApolloClient.mockReset();
  resetTableControls();
  tableControls.queries = [tableControls.queries[0], RICH_Q];
});
afterEach(() => vi.useRealTimers());

describe('PaymentLogsPage', () => {
  it('renders totals, rows, downloads an invoice and polls', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    tableControls.rows = [paySuccess, payFailed];
    mockedUseApolloClient.mockReturnValue(makeClient() as any);
    renderUI(<PaymentLogsPage />);

    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    expect(screen.getByText('Successful Payments')).toBeInTheDocument();

    fireEvent.click(enabledButtonFor('DownloadIcon'));
    await waitFor(() => expect(mockedUseApolloClient().query).toHaveBeenCalledWith(expect.objectContaining({ query: INVOICE_PDF })));
    vi.advanceTimersByTime(30000); // poll callback fires
  });

  it('shows an error when the invoice pdf is missing', async () => {
    tableControls.rows = [paySuccess];
    mockedUseApolloClient.mockReturnValue(makeClient(null) as any);
    renderUI(<PaymentLogsPage />);
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    fireEvent.click(enabledButtonFor('DownloadIcon'));
    expect(await screen.findByText('Invoice not available')).toBeInTheDocument();
    const alert = screen.getByText('Invoice not available').closest('.MuiAlert-root') as HTMLElement;
    fireEvent.click(within(alert).getByRole('button'));
  });

  it('refunds a successful payment', async () => {
    const refundFn = vi.fn().mockResolvedValue({});
    const refetch = vi.fn();
    mockedUseQuery.mockReturnValue({ data: { payments: listItems }, refetch } as any);
    mockedUseMutation.mockReturnValue([refundFn, { loading: false }] as any);
    tableControls.rows = [paySuccess, payFailed];
    mockedUseApolloClient.mockReturnValue(makeClient() as any);
    renderUI(<PaymentLogsPage />);
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    fireEvent.click(enabledButtonFor('UndoIcon'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/reason/i), { target: { value: 'duplicate' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm refund/i }));
    await waitFor(() => expect(refundFn).toHaveBeenCalled());
    expect(refetch).toHaveBeenCalled();
  });

  it('surfaces a refund error', async () => {
    mockedUseMutation.mockReturnValue([vi.fn().mockRejectedValue(new Error('refund failed')), { loading: false }] as any);
    tableControls.rows = [paySuccess];
    mockedUseApolloClient.mockReturnValue(makeClient() as any);
    renderUI(<PaymentLogsPage />);
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    fireEvent.click(enabledButtonFor('UndoIcon'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm refund/i }));
    expect(await within(dialog).findByText('refund failed')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
  });

  it('falls back to a generic message when the invoice query rejects without one', async () => {
    tableControls.rows = [paySuccess];
    mockedUseApolloClient.mockReturnValue({
      query: vi.fn(({ query }: any) =>
        query === INVOICE_PDF ? Promise.reject({}) : Promise.resolve({ data: { paymentsTable: { rows: tableControls.rows, total: 1 } } }),
      ),
    } as any);
    renderUI(<PaymentLogsPage />);
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    fireEvent.click(enabledButtonFor('DownloadIcon'));
    expect(await screen.findByText('Could not download invoice')).toBeInTheDocument();
  });

  it('falls back to a generic message when the refund rejects without one', async () => {
    mockedUseMutation.mockReturnValue([vi.fn().mockRejectedValue({}), { loading: false }] as any);
    tableControls.rows = [paySuccess];
    mockedUseApolloClient.mockReturnValue(makeClient() as any);
    renderUI(<PaymentLogsPage />);
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    fireEvent.click(enabledButtonFor('UndoIcon'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm refund/i }));
    expect(await within(dialog).findByText('Refund failed')).toBeInTheDocument();
  });

  it('renders with no payments data (empty totals)', async () => {
    mockedUseQuery.mockReturnValue({ data: undefined, refetch: vi.fn() } as any);
    tableControls.rows = [];
    mockedUseApolloClient.mockReturnValue(makeClient() as any);
    renderUI(<PaymentLogsPage />);
    await waitFor(() => expect(screen.getByText('No payments yet.')).toBeInTheDocument());
    expect(screen.getByText('Successful Payments')).toBeInTheDocument();
  });

  it('shows the refund loading label', async () => {
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: true }] as any);
    tableControls.rows = [paySuccess];
    mockedUseApolloClient.mockReturnValue(makeClient() as any);
    renderUI(<PaymentLogsPage />);
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    fireEvent.click(enabledButtonFor('UndoIcon'));
    expect(await screen.findByRole('button', { name: /refunding/i })).toBeDisabled();
  });
});
