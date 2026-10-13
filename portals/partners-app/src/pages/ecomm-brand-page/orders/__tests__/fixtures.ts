/** One own-brand Pod Shop order, with every field the orders documents select. */
type Over = Record<string, unknown>;

export const orderRow = (over: Over = {}) => ({
  __typename: 'ProductOrder',
  id: 'o1',
  order_no: 'ORD-1001',
  buyer_name: 'Meera Iyer',
  buyer_phone: '9000000001',
  line_items: [
    {
      __typename: 'OrderLineItem',
      product_id: 'p1',
      variant_id: 'v1',
      name: 'Pet Collar',
      variant_label: 'Large',
      qty: 2,
      unit_cost: 250,
      image_url: '',
      brand_id: 'b1',
    },
    {
      __typename: 'OrderLineItem',
      product_id: 'p2',
      variant_id: 'v2',
      name: 'Leash',
      variant_label: '',
      qty: 1,
      unit_cost: 100,
      image_url: '',
      brand_id: 'b1',
    },
  ],
  currency_symbol: '₹',
  total: 600,
  fulfilment_method: 'SHIP',
  fulfilment_status: 'AWAITING_SHIPMENT',
  shipping_address: {
    __typename: 'OrderShippingAddress',
    name: 'Meera Iyer',
    phone: '9000000001',
    email: 'meera@example.com',
    line1: '4 Lake Road',
    line2: 'Block B',
    landmark: 'Near park',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    country: 'India',
  },
  shiprocket: {
    __typename: 'ShipRocketInfo',
    order_id: '',
    shipment_id: '',
    awb: '',
    courier_name: '',
    tracking_status: '',
    etd: '',
    pickup_scheduled_date: '',
    sandbox: false,
  },
  tracking_events: [],
  last_error: '',
  cancelled_at: null,
  cancel_reason: '',
  deletion_request_no: '',
  refund: {
    __typename: 'OrderRefund',
    status: 'NONE',
    amount: 0,
    coins: 0,
    razorpay_refund_id: '',
    refunded_at: null,
    error: '',
  },
  created_at: '2026-07-01T10:00:00.000Z',
  ...over,
});

/** Merges into the nested shiprocket block of a row. */
export const shiprocket = (over: Over) => ({ ...orderRow().shiprocket, ...over });

/** A shipped order: booked, an AWB assigned, one scan. */
export const bookedOrder = (over: Over = {}) =>
  orderRow({
    fulfilment_status: 'SHIPPED',
    shiprocket: shiprocket({
      order_id: 'SR-77',
      shipment_id: 'SH-88',
      awb: 'AWB123',
      courier_name: 'BlueDart',
      tracking_status: 'In transit',
      etd: '2026-07-05',
      pickup_scheduled_date: '2026-07-02',
    }),
    tracking_events: [
      { __typename: 'OrderTrackingEvent', status: 'Picked up', location: 'Bengaluru hub', at: '2026-07-02T09:00:00.000Z' },
    ],
    ...over,
  });
