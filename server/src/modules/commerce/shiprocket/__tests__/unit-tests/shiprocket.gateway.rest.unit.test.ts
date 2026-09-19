jest.mock('@config/redis', () => ({
  ...jest.requireActual('@config/redis'),
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
}));
jest.mock('../../shiprocket.account', () => ({
  getShiprocketAccount: jest.fn(),
  isShiprocketConfigured: jest.fn(),
}));
jest.mock('../../shiprocket.client', () => ({
  ...jest.requireActual('../../shiprocket.client'),
  srRequest: jest.fn(),
}));

import { shiprocketError, srRequest } from '../../shiprocket.client';
import * as gw from '../../shiprocket.gateway';

/**
 * Every ShipRocket endpoint reduced to the few values we store. ShipRocket
 * nests the same field differently between endpoints (and versions), so each
 * reader is pinned here against the shapes the live API answers with. The
 * transport itself — auth, retries, the refusal latch — is exercised against
 * a fake ShipRocket in integration-tests/shiprocket.client.int.test.ts.
 */
const mockRequest = jest.mocked(srRequest);
const answer = (body: unknown) => mockRequest.mockResolvedValueOnce(body);
const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
const sentBody = (call = 0) => JSON.parse(mockRequest.mock.calls[call][1].body as string);

describe('orders', () => {
  it('creates an ad-hoc order once — never with retries, which could book a second parcel', async () => {
    answer({ order_id: 7300001, shipment_id: 6300001, status: 'NEW' });
    await expect(gw.createOrderAdhoc({ order_id: 'DUN-ORD-7F3K2' })).resolves.toEqual({
      order_id: '7300001',
      shipment_id: '6300001',
      status: 'NEW',
    });
    expect(mockRequest).toHaveBeenCalledWith('/orders/create/adhoc', post({ order_id: 'DUN-ORD-7F3K2' }), {
      op: 'createOrder',
    });
  });

  it('says why when ShipRocket answers without an order id', async () => {
    answer({ message: 'Wrong Pickup location entered' });
    await expect(gw.createOrderAdhoc({})).rejects.toThrow('ShipRocket did not create the order: Wrong Pickup location entered');
    answer({});
    await expect(gw.createOrderAdhoc({})).rejects.toThrow('ShipRocket did not create the order: no order id');
  });

  it('finds the order already booked under our order number', async () => {
    answer({ data: [{ id: 7300009, channel_order_id: 'DUN-ORD-7F3K2', status: 'NEW', shipments: [{ id: 6300009 }] }] });
    await expect(gw.findOrderByChannelId('DUN-ORD-7F3K2')).resolves.toEqual({
      order_id: '7300009',
      shipment_id: '6300009',
      status: 'NEW',
    });
    expect(mockRequest).toHaveBeenCalledWith('/orders?search=DUN-ORD-7F3K2', { method: 'GET' }, { op: 'findOrder', retry: true });
  });

  it('reads a single shipment object as well as a list', async () => {
    answer({ data: [{ id: 7300010, channel_order_id: 'DUN-ORD-9Q', shipments: { id: 6300010 } }] });
    await expect(gw.findOrderByChannelId('DUN-ORD-9Q')).resolves.toMatchObject({ shipment_id: '6300010' });
  });

  // ShipRocket's search is fuzzy: a near-miss must not be taken for our order.
  it('ignores a search hit with a different channel order id', async () => {
    answer({ data: [{ id: 7300011, channel_order_id: 'DUN-ORD-7F3K2-B' }] });
    await expect(gw.findOrderByChannelId('DUN-ORD-7F3K2')).resolves.toBeNull();
    answer({});
    await expect(gw.findOrderByChannelId('DUN-ORD-7F3K2')).resolves.toBeNull();
  });

  it('cancels only real numeric ShipRocket ids, and skips the call when none are left', async () => {
    answer({ message: 'Order cancelled successfully.' });
    await gw.cancelOrders(['7300001', 'not-an-id', '0']);
    expect(mockRequest).toHaveBeenCalledWith('/orders/cancel', post({ ids: [7300001] }), { op: 'cancelOrders' });
    mockRequest.mockClear();
    await gw.cancelOrders(['', 'abc']);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('creates a return order and says why when it cannot', async () => {
    answer({ order_id: 7400001, shipment_id: 6400001, status: 'RETURN PENDING' });
    await expect(gw.createReturnOrder({ order_id: 'RET-4F2A9C' })).resolves.toEqual({
      order_id: '7400001',
      shipment_id: '6400001',
      status: 'RETURN PENDING',
    });
    answer({ message: 'Pickup pincode is not serviceable' });
    await expect(gw.createReturnOrder({})).rejects.toThrow('ShipRocket did not create the return: Pickup pincode is not serviceable');
  });
});

describe('couriers, AWB and pickup', () => {
  it('lists the couriers for an order, the recommended one first, then the cheapest', async () => {
    answer({
      data: {
        recommended_courier_company_id: 24,
        available_courier_companies: [
          { courier_company_id: 12, courier_name: 'Delhivery Surface', rate: 68, cod: 1, rating: 4.3, etd: 'Sep 23, 2026' },
          { courier_company_id: 24, courier_name: 'Xpressbees Surface', freight_charge: 74, cod: 0 },
          { courier_company_id: 51, courier_name: 'Ekart Logistics', total_charge: 59, cod: true },
        ],
      },
    });
    const options = await gw.couriersForOrder('7300001');
    expect(options.map((o) => o.courier_company_id)).toEqual(['24', '51', '12']);
    expect(options[0]).toMatchObject({ recommended: true, rate: 74, cod: false });
    expect(options[1]).toMatchObject({ recommended: false, rate: 59, cod: true });
    expect(options[2]).toMatchObject({ rate: 68, cod: true, rating: 4.3, etd: 'Sep 23, 2026' });
    expect(mockRequest.mock.calls[0][0]).toBe('/courier/serviceability/?order_id=7300001');
  });

  it("assigns an AWB with the operator's courier and reads the nested answer", async () => {
    answer({
      awb_assign_status: 1,
      response: { data: { awb_code: '14336300001', courier_name: 'Delhivery Surface', courier_company_id: 12, label_url: 'https://labels.example/6300001.pdf' } },
    });
    await expect(gw.assignAwb('6300001', '12')).resolves.toEqual({
      awb: '14336300001',
      courier_name: 'Delhivery Surface',
      courier_company_id: '12',
      label_url: 'https://labels.example/6300001.pdf',
    });
    expect(sentBody()).toEqual({ shipment_id: '6300001', courier_id: '12' });
  });

  it("lets ShipRocket choose when no courier is given, and flags a return's AWB", async () => {
    answer({ awb_code: '59236400001' });
    await expect(gw.assignAwb('6400001', null, true)).resolves.toMatchObject({ awb: '59236400001', courier_name: '' });
    expect(sentBody()).toEqual({ shipment_id: '6400001', is_return: 1 });
  });

  it("refuses an answer with no AWB, in ShipRocket's words", async () => {
    answer({ awb_assign_status: 0, response: { data: { awb_assign_error: 'Insufficient wallet balance' } } });
    await expect(gw.assignAwb('6300001')).rejects.toThrow('ShipRocket could not assign an AWB: Insufficient wallet balance');
    answer({});
    await expect(gw.assignAwb('6300001')).rejects.toThrow('ShipRocket could not assign an AWB: no AWB returned');
  });

  it('requests the pickup and keeps its token and date', async () => {
    answer({ pickup_status: 1, response: { pickup_token_number: 'Reference No: 194612', pickup_scheduled_date: '2026-09-20 11:00:00' } });
    await expect(gw.generatePickup('6300001')).resolves.toEqual({
      token: 'Reference No: 194612',
      scheduled_date: '2026-09-20 11:00:00',
    });
    expect(sentBody()).toEqual({ shipment_id: [6300001] });
    answer({});
    await expect(gw.generatePickup('6300001')).resolves.toEqual({ token: '', scheduled_date: '' });
  });
});

describe('documents', () => {
  it('prints labels and invoices for many shipments at once (safe to retry)', async () => {
    answer({ label_url: 'https://labels.example/batch.pdf' });
    await expect(gw.generateLabel(['6300001', '6300002'])).resolves.toBe('https://labels.example/batch.pdf');
    expect(mockRequest).toHaveBeenCalledWith('/courier/generate/label', post({ shipment_id: [6300001, 6300002] }), {
      op: 'generateLabel',
      retry: true,
    });
    answer({ invoice_url: 'https://invoices.example/batch.pdf' });
    await expect(gw.printInvoice(['7300001'])).resolves.toBe('https://invoices.example/batch.pdf');
    expect(sentBody(1)).toEqual({ ids: [7300001] });
  });

  it('says so when ShipRocket returns no document', async () => {
    answer({ message: 'AWB not assigned' });
    await expect(gw.generateLabel(['6300001'])).rejects.toThrow('ShipRocket did not create the label: AWB not assigned');
    answer({});
    await expect(gw.printInvoice(['7300001'])).rejects.toThrow('ShipRocket did not create the invoice: no URL');
  });

  it('generates the manifest the first time', async () => {
    answer({ manifest_url: 'https://manifests.example/m1.pdf' });
    await expect(gw.manifestFor(['6300001'], ['7300001'])).resolves.toBe('https://manifests.example/m1.pdf');
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('prints the existing manifest when ShipRocket says it was already generated', async () => {
    mockRequest.mockRejectedValueOnce(shiprocketError('ShipRocket: Manifest already generated', 400));
    answer({ manifest_url: 'https://manifests.example/m1.pdf' });
    await expect(gw.manifestFor(['6300001'], ['7300001'])).resolves.toBe('https://manifests.example/m1.pdf');
    expect(mockRequest.mock.calls[1][0]).toBe('/manifests/print');
    expect(sentBody(1)).toEqual({ order_ids: [7300001] });
  });

  it('falls back to printing when generate answers without a URL, and fails when print does too', async () => {
    answer({});
    answer({});
    await expect(gw.manifestFor(['6300001'], ['7300001'])).rejects.toThrow('ShipRocket did not return the manifest');
  });

  it('passes any other manifest failure straight through', async () => {
    mockRequest.mockRejectedValueOnce(shiprocketError('ShipRocket: Shipment not found', 404));
    await expect(gw.manifestFor(['6300001'], ['7300001'])).rejects.toThrow('Shipment not found');
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});

describe('tracking and NDR', () => {
  it.each([
    ['2026-09-19 14:05:11', '2026-09-19T08:35:11.000Z'],
    ['2026-09-19T14:05:11Z', '2026-09-19T14:05:11.000Z'],
    ['2026-09-19T14:05:11+05:30', '2026-09-19T08:35:11.000Z'],
  ])('reads %s as Indian time unless it names a zone', (raw, iso) => {
    expect(gw.parseShiprocketDate(raw)?.toISOString()).toBe(iso);
  });

  it.each([[''], ['not a date']])('answers null for an unreadable date (%p)', (raw) => {
    expect(gw.parseShiprocketDate(raw)).toBeNull();
  });

  it('reads the status, status id, ETA and every scan from a tracking answer', async () => {
    answer({
      tracking_data: {
        track_status: 1,
        shipment_status: 7,
        etd: '2026-09-23 18:00:00',
        shipment_track: [{ current_status: 'Delivered' }],
        shipment_track_activities: [
          { date: '2026-09-22 16:42:10', status: 'DLVD', activity: 'Delivered to consignee', location: 'Gurugram_Sec57_DC', 'sr-status-label': 'DELIVERED' },
          { date: '2026-09-22 08:10:00', status: 'OFD', activity: 'Out for delivery', location: 'Gurugram_Sec57_DC' },
        ],
      },
    });
    await expect(gw.trackByAwb('14336300001')).resolves.toEqual({
      current_status: 'Delivered',
      status_id: 7,
      etd: '2026-09-23 18:00:00',
      activities: [
        { status: 'DELIVERED', location: 'Gurugram_Sec57_DC', note: 'Delivered to consignee', date: '2026-09-22 16:42:10' },
        { status: 'OFD', location: 'Gurugram_Sec57_DC', note: 'Out for delivery', date: '2026-09-22 08:10:00' },
      ],
    });
    expect(mockRequest).toHaveBeenCalledWith('/courier/track/awb/14336300001', { method: 'GET' }, { op: 'trackAwb', retry: true });
  });

  it('falls back to the latest scan for the status when no track row carries one', async () => {
    answer({ shipment_track_activities: [{ 'sr-status-label': 'OUT FOR DELIVERY' }] });
    await expect(gw.trackByShipment('6300001')).resolves.toEqual({
      current_status: 'OUT FOR DELIVERY',
      status_id: 0,
      etd: '',
      activities: [{ status: 'OUT FOR DELIVERY', location: '', note: '', date: '' }],
    });
    expect(mockRequest.mock.calls[0][0]).toBe('/courier/track/shipment/6300001');
  });

  it('answers empty tracking for an empty body', async () => {
    answer(null);
    await expect(gw.trackByAwb('14336300001')).resolves.toEqual({ current_status: '', status_id: 0, etd: '', activities: [] });
  });

  it('answers a failed delivery with the action and a comment', async () => {
    answer({ status: true });
    await gw.ndrAction('14336300001', 'return', 'Buyer unreachable for three attempts');
    expect(mockRequest).toHaveBeenCalledWith(
      '/ndr/14336300001/action',
      post({ action: 'return', comments: 'Buyer unreachable for three attempts' }),
      { op: 'ndrAction' }
    );
  });
});

describe('account', () => {
  it('registers a pickup location from either id shape', async () => {
    answer({ success: true, pickup_id: 88121 });
    answer({ address: { id: 88122 } });
    answer({ success: false });
    await expect(gw.addPickupLocation({})).resolves.toEqual({ pickup_id: '88121', registered: true });
    await expect(gw.addPickupLocation({})).resolves.toEqual({ pickup_id: '88122', registered: true });
    await expect(gw.addPickupLocation({})).resolves.toEqual({ pickup_id: '', registered: false });
  });

  it('lists the pickup addresses with whether ShipRocket has verified each', async () => {
    answer({
      data: {
        shipping_address: [
          { id: 88121, pickup_location: 'DUN-WH-NOIDA', address: 'B-14, Sector 63', address_2: '', city: 'Noida', state: 'Uttar Pradesh', pin_code: 201301, phone: '9811022334', phone_verified: 1 },
          { id: 88122, pickup_location: 'DUN-WH-BLR', address: '12 Hosur Rd', address_2: 'Bommanahalli', city: 'Bengaluru', status: 2 },
          { id: 88123, pickup_location: 'Primary', address: 'Old office', phone_verified: 0, status: 1 },
        ],
      },
    });
    const pickups = await gw.listPickupLocations();
    expect(pickups[0]).toEqual({
      id: '88121',
      nickname: 'DUN-WH-NOIDA',
      address: 'B-14, Sector 63',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
      phone: '9811022334',
      verified: true,
    });
    expect(pickups[1]).toMatchObject({ address: '12 Hosur Rd, Bommanahalli', verified: true });
    expect(pickups[2]).toMatchObject({ nickname: 'Primary', verified: false });
  });

  it('reads the wallet balance wherever ShipRocket puts it', async () => {
    answer({ data: { balance_amount: '1523.40' } });
    answer({ balance_amount: 88 });
    answer({});
    await expect(gw.walletBalance()).resolves.toBe(1523.4);
    await expect(gw.walletBalance()).resolves.toBe(88);
    await expect(gw.walletBalance()).resolves.toBe(0);
  });
});
