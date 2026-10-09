/**
 * Brand-order fixtures shared by the native Brand Orders suites (screens and
 * the useBrandOrder hook) — test data only, kept out of coverage like
 * companion-otp-fixture.ts.
 */

/** One row of the Brand Orders list. */
export const BRAND_ORDER_ROW = {
  id: 'o1',
  order_no: 'DUN-1',
  buyer_name: 'Riya',
  fulfilment_method: 'SHIP',
  fulfilment_status: 'FAILED',
  currency_symbol: '₹',
  total: 499,
  created_at: '2026-10-01T10:00:00.000Z',
  line_items: [{ qty: 2 }, { qty: 1 }],
  shiprocket: { awb: '' },
};

/** The ship-to the detail screen renders (a 5-digit PIN, so the fix form has something to refuse). */
export const SCREEN_ADDRESS = {
  name: 'Riya Sharma',
  phone: '9845012345',
  email: 'riya@example.com',
  line1: '221B Indiranagar',
  line2: '',
  landmark: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '56003',
  country: 'India',
};

/** A shipped order not booked yet, as the detail screen reads it. */
export const SCREEN_ORDER = {
  id: 'o1',
  order_no: 'DUN-1',
  buyer_name: 'Riya',
  fulfilment_method: 'SHIP',
  fulfilment_status: 'PENDING',
  currency_symbol: '₹',
  total: 499,
  created_at: '2026-10-01T10:00:00.000Z',
  cancelled_at: null,
  last_error: '',
  line_items: [
    {
      product_id: 'p1',
      variant_id: 'v1',
      variant_label: 'Large',
      name: 'Collar',
      image_url: 'https://img/c.png',
      qty: 1,
      gross: 299,
    },
    {
      product_id: 'p2',
      variant_id: '',
      variant_label: '',
      name: 'Leash',
      image_url: '',
      qty: 1,
      gross: 200,
    },
  ],
  shipping_address: SCREEN_ADDRESS,
  shiprocket: {
    order_id: '',
    shipment_id: '',
    awb: '',
    courier_name: '',
    tracking_status: '',
    etd: '',
    pickup_scheduled_date: '',
    label_url: '',
    invoice_url: '',
    manifest_url: '',
  },
};

/** The ship-to the hook loads. */
export const HOOK_ADDRESS = {
  name: 'Riya',
  phone: '9845012345',
  email: 'riya@example.com',
  line1: '221B Indiranagar',
  line2: '',
  landmark: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
  country: 'India',
};

/** The order the hook loads — ShipRocket has its invoice link only. */
export const HOOK_ORDER = {
  id: 'o1',
  order_no: 'DUN-1',
  last_error: '',
  shipping_address: HOOK_ADDRESS,
  shiprocket: {
    order_id: '',
    awb: '',
    label_url: '',
    invoice_url: 'https://sr/invoice.pdf',
    manifest_url: '',
  },
};

/** What useBrandOrder hands the detail screen: the order loaded, nothing in flight. */
export const brandOrderState = (over: Record<string, unknown> = {}) => ({
  order: SCREEN_ORDER,
  isLoading: false,
  error: null,
  busy: false,
  notice: null,
  retry: jest.fn(),
  book: jest.fn(),
  refreshTracking: jest.fn(),
  saveAddress: jest.fn().mockResolvedValue(true),
  document: jest.fn(),
  ...over,
});
