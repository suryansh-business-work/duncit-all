import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BrandOrderDetailPage from '..';
import {
  BRAND_BOOK_SHIPMENT,
  BRAND_PRODUCT_ORDER,
  BRAND_SHIPMENT_FILE,
} from '../../brand-orders-page/queries';

const files = vi.hoisted(() => ({ print: vi.fn(), download: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../../components/notify', () => ({ notifySuccess: toast.success, notifyError: toast.error }));
vi.mock('@duncit/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/utils')>()),
  printBase64File: files.print,
  downloadBase64File: files.download,
}));

// The admin's date settings are their own query; the page only needs a formatter.
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDateTime: (d: string) => `when:${d}` }),
}));

const SR = {
  __typename: 'ShipRocketInfo',
  order_id: '',
  shipment_id: '',
  awb: '',
  courier_name: '',
  tracking_status: '',
  etd: '',
  pickup_scheduled_date: '',
};

const order = (over: Record<string, unknown> = {}) => ({
  __typename: 'ProductOrder',
  id: 'o1',
  order_no: 'DUN-1',
  buyer_name: 'Riya',
  buyer_phone: null,
  fulfilment_method: 'SHIP',
  fulfilment_status: 'PENDING',
  currency_symbol: '₹',
  items_total: 499,
  shipping_charge: 0,
  total: 499,
  created_at: '2026-10-01T10:00:00.000Z',
  cancelled_at: null,
  last_error: '',
  pickup_ref: '',
  line_items: [
    { __typename: 'OrderLineItem', product_id: 'p1', variant_id: '', variant_label: '', name: 'Collar', image_url: '', qty: 1, gross: 499 },
  ],
  shipping_address: {
    __typename: 'OrderShippingAddress',
    name: 'Riya Sharma',
    phone: '9845012345',
    email: 'riya@example.com',
    line1: '221B Indiranagar',
    line2: '',
    landmark: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    country: 'India',
  },
  shiprocket: SR,
  ...over,
});

const SHIPPED = order({
  fulfilment_status: 'SHIPPED',
  shiprocket: { ...SR, order_id: 'SR1', shipment_id: 'SH1', awb: 'AWB1', courier_name: 'Delhivery', tracking_status: 'In transit', etd: 'Oct 12', pickup_scheduled_date: 'Oct 10' },
});

const orderMock = (data: unknown): MockedResponse => ({
  request: { query: BRAND_PRODUCT_ORDER, variables: { id: 'o1' } },
  result: { data: { brandProductOrder: data } },
});

function renderPage(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={['/products/orders/o1']}>
        <Routes>
          <Route path="/products/orders/:id" element={<BrandOrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(() => vi.clearAllMocks());

describe('BrandOrderDetailPage', () => {
  it('before booking: the order, its ship-to, and only Book and Fix address', async () => {
    renderPage([orderMock(order())]);
    expect(await screen.findByTestId('brand-order-summary')).toHaveTextContent('Order #DUN-1');
    expect(screen.getByTestId('brand-order-ship-to')).toHaveTextContent('221B Indiranagar');
    expect(screen.getByTestId('brand-order-not-booked')).toBeInTheDocument();
    expect(screen.getByTestId('brand-order-book')).toHaveTextContent('Book shipment');
    expect(screen.getByTestId('brand-order-fix-address')).toBeInTheDocument();
    expect(screen.queryByTestId('brand-order-documents')).toBeNull();
    expect(screen.queryByTestId('brand-order-open-shiprocket')).toBeNull();
  });

  it('books the shipment and says so', async () => {
    renderPage([
      orderMock(order()),
      {
        request: { query: BRAND_BOOK_SHIPMENT, variables: { id: 'o1' } },
        result: { data: { brandBookProductOrderShipment: SHIPPED } },
      },
    ]);
    fireEvent.click(await screen.findByTestId('brand-order-book'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Shipment booked with ShipRocket.'));
    expect(await screen.findByTestId('brand-order-awb')).toHaveTextContent('AWB1');
  });

  it('shows why a booking stopped, and offers a retry', async () => {
    renderPage([orderMock(order({ last_error: 'Pickup address not verified' }))]);
    expect(await screen.findByTestId('brand-order-last-error')).toHaveTextContent('Booking stopped: Pickup address not verified');
    expect(screen.getByTestId('brand-order-book')).toHaveTextContent('Retry booking');
  });

  it('once shipped: every ShipRocket fact, both links and the documents', async () => {
    renderPage([orderMock(SHIPPED)]);
    expect(await screen.findByTestId('brand-order-sr-order')).toHaveTextContent('SR1');
    expect(screen.getByTestId('brand-order-sr-shipment')).toHaveTextContent('SH1');
    expect(screen.getByTestId('brand-order-courier')).toHaveTextContent('Delhivery');
    expect(screen.getByTestId('brand-order-etd')).toHaveTextContent('Oct 12');
    expect(screen.getByTestId('brand-order-pickup-date')).toHaveTextContent('Oct 10');
    expect(screen.getByTestId('brand-order-tracking')).toHaveTextContent('In transit');
    expect(screen.getByTestId('brand-order-track')).toHaveAttribute('href', 'https://shiprocket.co/tracking/AWB1');
    expect(screen.getByTestId('brand-order-open-shiprocket')).toHaveAttribute(
      'href',
      'https://app.shiprocket.in/seller/orders/details/SR1',
    );
    expect(screen.getByText('Opens this order in your brand’s ShipRocket account.')).toBeInTheDocument();
    for (const kind of ['LABEL', 'INVOICE', 'MANIFEST']) {
      expect(screen.getByTestId(`brand-order-print-${kind}`)).toBeInTheDocument();
      expect(screen.getByTestId(`brand-order-download-${kind}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('brand-order-book')).toBeNull();
    expect(screen.queryByTestId('brand-order-fix-address')).toBeNull();
  });

  it('prints the label in place and saves the invoice under its own name', async () => {
    const fileMock = (kind: string, filename: string): MockedResponse => ({
      request: { query: BRAND_SHIPMENT_FILE, variables: { ids: ['o1'], kind } },
      result: {
        data: { brandProductOrderShipmentFile: { __typename: 'ShipmentFile', filename, mime: 'application/pdf', content_base64: 'JVBE' } },
      },
    });
    renderPage([orderMock(SHIPPED), fileMock('LABEL', 'label.pdf'), fileMock('INVOICE', 'invoice.pdf')]);
    fireEvent.click(await screen.findByTestId('brand-order-print-LABEL'));
    await waitFor(() => expect(files.print).toHaveBeenCalledWith('JVBE', 'application/pdf', 'label.pdf'));
    fireEvent.click(screen.getByTestId('brand-order-download-INVOICE'));
    await waitFor(() => expect(files.download).toHaveBeenCalledWith('JVBE', 'invoice.pdf', 'application/pdf'));
  });

  it('says when a document could not be fetched', async () => {
    renderPage([
      orderMock(SHIPPED),
      { request: { query: BRAND_SHIPMENT_FILE, variables: { ids: ['o1'], kind: 'MANIFEST' } }, error: new Error('No manifest yet') },
    ]);
    fireEvent.click(await screen.findByTestId('brand-order-print-MANIFEST'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No manifest yet'));
    expect(files.print).not.toHaveBeenCalled();
  });

  it('is read-only once cancelled, and for a pickup order', async () => {
    const { unmount } = renderPage([orderMock(order({ cancelled_at: '2026-10-02T00:00:00.000Z' }))]);
    expect(await screen.findByTestId('brand-order-cancelled')).toBeInTheDocument();
    expect(screen.queryByTestId('brand-order-actions')).toBeNull();
    unmount();
    renderPage([orderMock(order({ fulfilment_method: 'PICKUP' }))]);
    expect(await screen.findByTestId('brand-order-pickup')).toBeInTheDocument();
    expect(screen.queryByTestId('brand-order-actions')).toBeNull();
  });

  it('says when the order is not the partner’s, or did not load', async () => {
    const { unmount } = renderPage([orderMock(null)]);
    expect(await screen.findByTestId('brand-order-not-found')).toBeInTheDocument();
    unmount();
    renderPage([{ request: orderMock(null).request, error: new Error('Network down') }]);
    expect(await screen.findByTestId('brand-order-error')).toHaveTextContent('Network down');
  });
});
