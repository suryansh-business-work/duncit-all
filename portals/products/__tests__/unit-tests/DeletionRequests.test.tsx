import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import DeletionImpactView from '../../src/pages/deletion-requests/DeletionImpactView';
import DeletionRequestsPage from '../../src/pages/deletion-requests/DeletionRequestsPage';
import DeletionRefundsPage from '../../src/pages/deletion-requests/DeletionRefundsPage';
import { deletionColumns } from '../../src/pages/deletion-requests/deletionColumns';
import { refundColumns, refundStatusLabel } from '../../src/pages/deletion-requests/refundColumns';
import { renderWithProviders } from '../testkit';
import { makeDeletionDetail, makeDeletionRequest, makeRefundRow } from '../mocks/deletion.mock';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (io) => ({
  ...(await io<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDate: (v: string) => `D:${v}`, formatDateTime: (v: string) => `DT:${v}` }),
}));
vi.mock('../../src/pages/deletion-requests/DeletionReviewDialog', () => ({
  default: ({ requestId, onClose, onReviewed }: { requestId: string | null; onClose: () => void; onReviewed: () => void }) => (
    <div data-testid="review-dialog" data-id={requestId ?? ''}>
      <button type="button" onClick={onClose}>
        stub-close
      </button>
      <button type="button" onClick={onReviewed}>
        stub-reviewed
      </button>
    </div>
  ),
}));

const t = (key: string) => key;
const fmt = { formatDate: (v: string) => `D:${v}`, formatDateTime: (v: string) => `DT:${v}` };

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{`${loc.pathname}${loc.search}`}</div>;
}

const renderAt = (path: string, element: ReactNode, entry: string) =>
  renderWithProviders(null as never, {
    initialEntries: [entry],
    routes: (
      <>
        <Route path={path} element={element} />
        <Route path="*" element={<Where />} />
      </>
    ),
  });

describe('DeletionImpactView', () => {
  it('reports nothing running when no order or return is open', () => {
    render(
      <MemoryRouter>
        <DeletionImpactView impact={makeDeletionDetail().impact} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Nothing is running on it/)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/…and/)).not.toBeInTheDocument();
    expect(screen.queryByText(/go with the brand/)).not.toBeInTheDocument();
  });

  it('lists running orders, the overflow count and the brand products', () => {
    render(
      <MemoryRouter>
        <DeletionImpactView
          impact={makeDeletionDetail(
            {},
            {
              open_orders: 5,
              open_returns: 2,
              orders: [
                {
                  id: 'o9',
                  order_no: 'ORD-9',
                  fulfilment_status: 'PACKED',
                  fulfilment_method: 'SHIPROCKET',
                  created_at: '2026-10-01',
                  total: 1250.5,
                  currency_symbol: '₹',
                  units: 3,
                },
              ],
              products: [
                { id: 'p1', product_name: 'Mug', is_active: true },
                { id: 'p2', product_name: 'Cap', is_active: false },
              ],
            },
          ).impact}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('5 order(s) still running and 2 return(s) open. The deletion waits for them.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ORD-9' })).toHaveAttribute('href', '/orders/o9');
    expect(screen.getByText(/PACKED · SHIPROCKET · .* · 3 unit\(s\) · ₹1,250.50/)).toBeInTheDocument();
    expect(screen.getByText('…and 4 more')).toBeInTheDocument();
    expect(screen.getByText('2 product(s) go with the brand: Mug, Cap')).toBeInTheDocument();
  });
});

describe('deletionColumns', () => {
  const byField = (kind: 'PRODUCT' | 'BRAND') =>
    Object.fromEntries(deletionColumns(kind, t, fmt).map((c) => [c.field, c]));

  it('uses a plain brand column for brand requests and a two-line product cell otherwise', () => {
    const brandCols = byField('BRAND');
    expect(brandCols.brand_name).toBeDefined();
    expect(brandCols.product_name).toBeUndefined();
    const productCols = byField('PRODUCT');
    expect(productCols.brand_name).toBeUndefined();
    const cell = productCols.product_name.cellRenderer as (r: unknown) => ReactNode;
    const { rerender } = render(<div>{cell(makeDeletionRequest({ parent_id: 'parent' }))}</div>);
    expect(screen.getByText('Blue Mug')).toBeInTheDocument();
    expect(screen.getByText(/Acme · products.deletionRequests.partOfBrand/)).toBeInTheDocument();
    rerender(<div>{cell(makeDeletionRequest())}</div>);
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('shows the blocked reason only on an approved request and builds filter options', () => {
    const cols = byField('PRODUCT');
    const status = cols.status.cellRenderer as (r: unknown) => ReactNode;
    const { rerender } = render(<div>{status(makeDeletionRequest({ status: 'APPROVED', blocked_reason: 'Orders open' }))}</div>);
    expect(screen.getByText('Orders open')).toBeInTheDocument();
    rerender(<div>{status(makeDeletionRequest({ status: 'PENDING', blocked_reason: 'Orders open' }))}</div>);
    expect(screen.queryByText('Orders open')).not.toBeInTheDocument();
    rerender(<div>{status(makeDeletionRequest({ status: 'APPROVED', blocked_reason: '' }))}</div>);
    expect(screen.queryByText('Orders open')).not.toBeInTheDocument();
    expect((cols.status as { options: { value: string }[] }).options.map((o) => o.value)).toEqual([
      'PENDING',
      'APPROVED',
      'REJECTED',
      'WITHDRAWN',
      'COMPLETED',
    ]);
    expect((cols.mode as { options: { value: string }[] }).options.map((o) => o.value)).toEqual([
      'WAIT_FOR_ORDERS',
      'CANCEL_AND_REFUND',
    ]);
  });

  it('formats mode and dates, using a dash when a date is missing', () => {
    const cols = byField('PRODUCT');
    const row = makeDeletionRequest({ mode: 'CANCEL_AND_REFUND' });
    const get = (field: string, r = row) => (cols[field].valueGetter as (x: unknown) => unknown)(r);
    expect(get('mode')).toBe('products.deletionRequests.mode.CANCEL_AND_REFUND');
    expect(get('scheduled_for')).toBe('D:2026-11-01T00:00:00.000Z');
    expect(get('created_at')).toBe('DT:2026-10-01T10:00:00.000Z');
    expect(get('scheduled_for', makeDeletionRequest({ scheduled_for: '' }))).toBe('—');
    expect(get('created_at', makeDeletionRequest({ created_at: '' }))).toBe('—');
  });
});

describe('DeletionRequestsPage', () => {
  it('lists product requests and opens the review dialog on a row click', async () => {
    __setTableRows([makeDeletionRequest()]);
    renderWithProviders(<DeletionRequestsPage kind="PRODUCT" />);
    expect(screen.getByRole('heading', { name: 'Product deletion requests' })).toBeInTheDocument();
    expect(screen.queryByText(/Showing the products of/)).not.toBeInTheDocument();
    expect(screen.getByTestId('review-dialog')).toHaveAttribute('data-id', '');
    fireEvent.click(await screen.findByTestId('table-row'));
    expect(screen.getByTestId('review-dialog')).toHaveAttribute('data-id', 'del-1');
    fireEvent.click(screen.getByRole('button', { name: 'stub-reviewed' }));
    fireEvent.click(screen.getByRole('button', { name: 'stub-close' }));
    expect(screen.getByTestId('review-dialog')).toHaveAttribute('data-id', '');
  });

  it('drills a brand request into its products with the review prefilled', async () => {
    __setTableRows([makeDeletionRequest({ id: 'br-1', kind: 'BRAND', brand_name: 'Acme & Co' })]);
    renderWithProviders(<DeletionRequestsPage kind="BRAND" />, {
      routes: <Route path="*" element={<><DeletionRequestsPage kind="BRAND" /><Where /></>} />,
    });
    expect(screen.getByRole('heading', { name: 'Brand deletion requests' })).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('table-row'));
    expect(screen.getByTestId('where')).toHaveTextContent(
      '/deletion-requests/products?parent=br-1&brand=Acme+%26+Co&review=br-1',
    );
  });

  it('shows the brand filter chip, reopens the brand review and clears the filter', async () => {
    __setTableRows([]);
    renderAt('/deletion-requests/products', <DeletionRequestsPage kind="PRODUCT" />, '/deletion-requests/products?parent=br-1&brand=Acme&review=br-1');
    expect(screen.getByText('Showing the products of Acme')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Review brand request'));
    expect(screen.getByTestId('review-dialog')).toHaveAttribute('data-id', 'br-1');
    const clear = screen.getByText('Show all').closest('.MuiChip-root') as HTMLElement;
    fireEvent.click(within(clear).getByTestId('CancelIcon'));
    await waitFor(() => expect(screen.queryByText('Showing the products of Acme')).not.toBeInTheDocument());
  });

  it('omits the review chip when the drill-down carries no brand request', () => {
    __setTableRows([]);
    renderAt('/deletion-requests/products', <DeletionRequestsPage kind="PRODUCT" />, '/deletion-requests/products?parent=br-1');
    expect(screen.getByText('Showing the products of')).toBeInTheDocument();
    expect(screen.queryByText('Review brand request')).not.toBeInTheDocument();
  });

  it('ignores a parent filter on the brand list', () => {
    __setTableRows([]);
    renderAt('/x', <DeletionRequestsPage kind="BRAND" />, '/x?parent=br-1');
    expect(screen.queryByText(/Showing the products of/)).not.toBeInTheDocument();
  });
});

describe('refundColumns', () => {
  const cols = Object.fromEntries(refundColumns(t, fmt).map((c) => [c.field, c]));
  const get = (field: string, row = makeRefundRow()) => (cols[field].valueGetter as (x: unknown) => unknown)(row);

  it('reads every refund cell as the CSV would', () => {
    expect(get('deletion_request_no')).toBe('DEL-0001');
    expect(get('brand_name')).toBe('Acme');
    expect(get('line_items')).toBe('Blue Mug (Large) × 2');
    expect(get('total')).toBe('₹499.00');
    expect(get('refund_status')).toBe('products.deletionRefunds.status.PROCESSED');
    expect(get('refund_amount')).toBe('₹499.00');
    expect(get('refund_coins')).toBe(20);
    expect(get('cancelled_at')).toBe('D:2026-10-02T10:00:00.000Z');
    expect(get('refunded_at')).toBe('DT:2026-10-03T10:00:00.000Z');
    expect(get('razorpay_refund_id')).toBe('rfnd_1');
    expect(get('refund_error')).toBe('—');
  });

  it('falls back to dashes and a bare amount when optional data is missing', () => {
    const bare = makeRefundRow({
      deletion_request_no: '',
      brand_name: null,
      currency_symbol: '',
      cancelled_at: null,
      line_items: [{ name: 'Cap', variant_label: '', qty: 1 }],
      refund: { status: 'FAILED', amount: 0, coins: 0, razorpay_refund_id: '', refunded_at: null, error: 'Declined' },
    });
    expect(get('deletion_request_no', bare)).toBe('—');
    expect(get('brand_name', bare)).toBe('—');
    expect(get('line_items', bare)).toBe('Cap × 1');
    expect(get('cancelled_at', bare)).toBe('—');
    expect(get('refunded_at', bare)).toBe('—');
    expect(get('razorpay_refund_id', bare)).toBe('—');
    expect(get('refund_error', bare)).toBe('Declined');
    expect(get('total', bare)).toMatch(/499/);
  });

  it('labels every refund status and offers all but NONE as filters', () => {
    expect(refundStatusLabel('NONE', t)).toBe('products.deletionRefunds.status.NONE');
    expect(refundStatusLabel('PENDING', t)).toBe('products.deletionRefunds.status.PENDING');
    expect(refundStatusLabel('RECORDED', t)).toBe('products.deletionRefunds.status.RECORDED');
    expect(refundStatusLabel('FAILED', t)).toBe('products.deletionRefunds.status.FAILED');
    expect((cols.refund_status as { options: { value: string }[] }).options.map((o) => o.value)).toEqual([
      'PENDING',
      'PROCESSED',
      'RECORDED',
      'FAILED',
    ]);
    const chip = cols.refund_status.cellRenderer as (r: unknown) => ReactNode;
    render(<div>{chip(makeRefundRow())}</div>);
    expect(screen.getByText('products.deletionRefunds.status.PROCESSED')).toBeInTheDocument();
  });
});

describe('DeletionRefundsPage', () => {
  it('lists every refund and opens the order on a row click', async () => {
    __setTableRows([makeRefundRow({ id: 'o77' })]);
    renderWithProviders(<DeletionRefundsPage />, {
      routes: <Route path="*" element={<><DeletionRefundsPage /><Where /></>} />,
    });
    expect(screen.getByRole('heading', { name: 'Deletion Refunds' })).toBeInTheDocument();
    expect(screen.queryByText(/Showing the orders cancelled/)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('table-row'));
    expect(await screen.findByTestId('where')).toHaveTextContent('/orders/o77');
  });

  it('filters by deletion request and clears back to the full list', async () => {
    __setTableRows([]);
    renderAt('/deletion-requests/refunds', <DeletionRefundsPage />, '/deletion-requests/refunds?request=del-1&no=DEL-0001');
    expect(screen.getByText('Showing the orders cancelled by deletion request DEL-0001.')).toBeInTheDocument();
    const clear = screen.getByText('Show all').closest('.MuiChip-root') as HTMLElement;
    fireEvent.click(within(clear).getByTestId('CancelIcon'));
    await waitFor(() => expect(screen.queryByText(/Showing the orders cancelled/)).not.toBeInTheDocument());
  });

  it('copes with a request id that has no request number', () => {
    __setTableRows([]);
    renderAt('/r', <DeletionRefundsPage />, '/r?request=del-1');
    expect(screen.getByText('Showing the orders cancelled by deletion request .')).toBeInTheDocument();
  });
});
