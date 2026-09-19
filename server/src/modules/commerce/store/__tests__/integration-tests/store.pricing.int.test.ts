jest.mock('@modules/commerce/shiprocket/shiprocket.gateway', () => ({
  getServiceability: jest.fn(),
  isShiprocketConfigured: jest.fn(),
}));

import { Types } from 'mongoose';
import {
  getServiceability,
  isShiprocketConfigured,
  type ServiceabilityQuote,
} from '@modules/commerce/shiprocket/shiprocket.gateway';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { priceStoreCart, quoteStoreShipping, type CodBlock, type StoreLine } from '../../store.pricing';
import { StoreSettingsModel } from '../../storeSettings.model';

/**
 * The pet store's delivery charge and cash-on-delivery rules. The charge a
 * shopper sees at checkout is the one they pay, so each rule is pinned:
 * free at or above the store's threshold, the live ShipRocket rate otherwise,
 * and the store's flat fee whenever ShipRocket cannot be asked.
 */
const mockConfigured = jest.mocked(isShiprocketConfigured);
const mockRate = jest.mocked(getServiceability);

const DELHIVERY: ServiceabilityQuote = {
  serviceable: true,
  courier_name: 'Delhivery Surface',
  courier_company_id: '12',
  freight_charge: 68,
  etd: 'Sep 23, 2026',
};

const GURUGRAM_PIN = '122002';

const settings = (over: Record<string, unknown> = {}) =>
  new StoreSettingsModel({ free_shipping_above: 999, flat_shipping_fee: 49, cod_enabled: true, cod_fee: 39, ...over });

const seedWarehouse = (nickname: string, pincode: string) =>
  BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname, pincode, city: 'Noida', state: 'Uttar Pradesh' });

/** Two ₹349 packs of jerky from one warehouse — ₹698 of goods. */
const jerky = (warehouseId: unknown, over: Partial<StoreLine> = {}): StoreLine => ({
  product_id: new Types.ObjectId().toHexString(),
  pod_id: '',
  variant_id: '',
  variant_label: '',
  variant_sku: '',
  name: 'Drools Chicken Jerky 200g',
  slug: 'drools-chicken-jerky-200g',
  image_url: '',
  brand_name: 'Drools',
  quantity: 2,
  requested_qty: 2,
  unit_cost: 349,
  mrp: 399,
  gross: 698,
  available: 40,
  max_qty: 10,
  cod_available: true,
  returnable: true,
  warehouse_id: String(warehouseId),
  weight_kg: 0.25,
  length_cm: 20,
  breadth_cm: 14,
  height_cm: 5,
  fulfilment_method: 'SHIP',
  issue: null,
  ...over,
});

beforeEach(() => {
  mockConfigured.mockResolvedValue(true);
  mockRate.mockResolvedValue(DELHIVERY);
});

describe('quoteStoreShipping', () => {
  it("rates each warehouse's packed parcel live, with its dimensions and declared value", async () => {
    const noida = await seedWarehouse('DUN-WH-NOIDA', '201301');
    const quote = await quoteStoreShipping([jerky(noida._id)], GURUGRAM_PIN, settings(), { goodsTotal: 698, cod: false });
    expect(mockRate).toHaveBeenCalledTimes(1);
    expect(mockRate).toHaveBeenCalledWith({
      pickupPincode: '201301',
      deliveryPincode: GURUGRAM_PIN,
      weightKg: 0.5,
      lengthCm: 20,
      breadthCm: 14,
      heightCm: 10,
      declaredValue: 698,
    });
    expect(quote).toEqual({
      total: 68,
      breakup: [
        {
          pod_id: '',
          warehouse_id: String(noida._id),
          pickup_pincode: '201301',
          courier_name: 'Delhivery Surface',
          charge: 68,
          quoted: true,
          free: false,
          etd: 'Sep 23, 2026',
        },
      ],
      all_quoted: true,
      serviceable: true,
      cod_serviceable: true,
      etd: 'Sep 23, 2026',
    });
  });

  it.each([
    [499, 0, true],
    [650, 0, true],
    [498, 68, false],
  ])('with free shipping above ₹499, ₹%p of goods pays ₹%p', async (goodsTotal, charge, free) => {
    const noida = await seedWarehouse('DUN-WH-NOIDA', '201301');
    const quote = await quoteStoreShipping([jerky(noida._id)], GURUGRAM_PIN, settings({ free_shipping_above: 499 }), {
      goodsTotal,
      cod: false,
    });
    expect(quote.total).toBe(charge);
    expect(quote.breakup[0]).toMatchObject({ charge, free, quoted: true });
  });

  it('never ships free when the store has no threshold', async () => {
    const noida = await seedWarehouse('DUN-WH-NOIDA', '201301');
    const quote = await quoteStoreShipping([jerky(noida._id)], GURUGRAM_PIN, settings({ free_shipping_above: 0 }), {
      goodsTotal: 5000,
      cod: false,
    });
    expect(quote.total).toBe(68);
  });

  it('charges the flat fee without asking when ShipRocket is not configured', async () => {
    mockConfigured.mockResolvedValue(false);
    const noida = await seedWarehouse('DUN-WH-NOIDA', '201301');
    const quote = await quoteStoreShipping([jerky(noida._id)], GURUGRAM_PIN, settings(), { goodsTotal: 698, cod: false });
    expect(mockRate).not.toHaveBeenCalled();
    expect(quote).toMatchObject({ total: 49, all_quoted: false, serviceable: true, cod_serviceable: true });
    expect(quote.breakup[0]).toMatchObject({ charge: 49, quoted: false, courier_name: '' });
  });

  it('charges the flat fee when ShipRocket fails, and still lets the order through', async () => {
    mockRate.mockRejectedValue(new Error('ShipRocket did not answer (serviceability) — try again shortly'));
    const noida = await seedWarehouse('DUN-WH-NOIDA', '201301');
    const quote = await quoteStoreShipping([jerky(noida._id)], GURUGRAM_PIN, settings(), { goodsTotal: 698, cod: false });
    expect(quote).toMatchObject({ total: 49, all_quoted: false, serviceable: true });
  });

  it('is still free above the threshold when ShipRocket cannot be asked', async () => {
    mockConfigured.mockResolvedValue(false);
    const noida = await seedWarehouse('DUN-WH-NOIDA', '201301');
    const quote = await quoteStoreShipping([jerky(noida._id)], GURUGRAM_PIN, settings({ free_shipping_above: 499 }), {
      goodsTotal: 698,
      cod: false,
    });
    expect(quote.breakup[0]).toMatchObject({ charge: 0, free: true, quoted: false });
  });

  it('charges the flat fee for a pincode that is not six digits, or a line with no warehouse', async () => {
    const noida = await seedWarehouse('DUN-WH-NOIDA', '201301');
    const badPin = await quoteStoreShipping([jerky(noida._id)], '12200', settings(), { goodsTotal: 698, cod: false });
    const noWarehouse = await quoteStoreShipping([jerky('')], GURUGRAM_PIN, settings(), { goodsTotal: 698, cod: false });
    expect(mockRate).not.toHaveBeenCalled();
    expect(badPin.total).toBe(49);
    expect(noWarehouse.breakup[0]).toMatchObject({ warehouse_id: '', pickup_pincode: '', charge: 49 });
  });

  it('reports a lane no courier serves as not serviceable', async () => {
    mockRate.mockResolvedValue(null);
    const noida = await seedWarehouse('DUN-WH-NOIDA', '201301');
    const quote = await quoteStoreShipping([jerky(noida._id)], GURUGRAM_PIN, settings(), { goodsTotal: 698, cod: false });
    expect(quote).toMatchObject({ total: 49, serviceable: false, cod_serviceable: false, all_quoted: false });
  });

  it('charges the COD rate for a COD order, and flags a lane with no COD courier', async () => {
    mockRate.mockImplementation(async (args) => (args.cod ? { ...DELHIVERY, freight_charge: 93 } : DELHIVERY));
    const noida = await seedWarehouse('DUN-WH-NOIDA', '201301');
    const cod = await quoteStoreShipping([jerky(noida._id)], GURUGRAM_PIN, settings(), { goodsTotal: 698, cod: true });
    expect(mockRate).toHaveBeenCalledWith(expect.objectContaining({ cod: true }));
    expect(cod).toMatchObject({ total: 93, cod_serviceable: true });

    mockRate.mockImplementation(async (args) => (args.cod ? null : DELHIVERY));
    const prepaidOnly = await quoteStoreShipping([jerky(noida._id)], GURUGRAM_PIN, settings(), { goodsTotal: 698, cod: true });
    expect(prepaidOnly).toMatchObject({ total: 68, serviceable: true, cod_serviceable: false });
  });

  it('ships one parcel per warehouse and drops lines with nothing to ship', async () => {
    const noida = await seedWarehouse('DUN-WH-NOIDA', '201301');
    const blr = await seedWarehouse('DUN-WH-BLR', '560068');
    const quote = await quoteStoreShipping(
      [jerky(noida._id), jerky(blr._id), jerky(blr._id, { quantity: 0 })],
      GURUGRAM_PIN,
      settings(),
      { goodsTotal: 1396, cod: false }
    );
    expect(quote.breakup.map((l) => l.pickup_pincode)).toEqual(['201301', '560068']);
    expect(quote.total).toBe(136);
    const empty = await quoteStoreShipping([jerky(noida._id, { quantity: 0 })], GURUGRAM_PIN, settings(), { goodsTotal: 0, cod: false });
    expect(empty).toEqual({ total: 0, breakup: [], all_quoted: true, serviceable: true, cod_serviceable: true, etd: '' });
  });
});

describe('priceStoreCart — cash on delivery', () => {
  const price = async (settingsOver: Record<string, unknown>, lineOver: Partial<StoreLine> = {}) => {
    const noida = await seedWarehouse('DUN-WH-NOIDA', '201301');
    return priceStoreCart({
      lines: [jerky(noida._id, lineOver)],
      settings: settings({ free_shipping_above: 499, ...settingsOver }),
      pincode: GURUGRAM_PIN,
      paymentMethod: 'COD',
    });
  };

  it('offers COD, adding the COD fee to what the courier collects', async () => {
    const quote = await price({});
    expect(quote.cod_block).toBeNull();
    expect(quote.cod_fee).toBe(39);
    expect(quote.prepaid_discount).toBe(0);
    // ₹698 of goods, free delivery above ₹499, ₹39 COD fee.
    expect(quote.quote.total).toBe(737);
  });

  it.each<[string, Record<string, unknown>, Partial<StoreLine>, CodBlock]>([
    ['COD is switched off', { cod_enabled: false }, {}, 'DISABLED'],
    ['a product is prepaid-only', {}, { cod_available: false }, 'PRODUCT'],
    ['the pincode is on the block list', { cod_blocked_pincodes: [GURUGRAM_PIN] }, {}, 'PINCODE'],
    ['the order is under the COD minimum', { cod_min_order: 1000 }, {}, 'MIN_ORDER'],
    ['the order is over the COD maximum', { cod_max_order: 700 }, {}, 'MAX_ORDER'],
  ])('blocks COD when %s', async (_why, settingsOver, lineOver, block) => {
    expect((await price(settingsOver, lineOver)).cod_block).toBe(block);
  });

  it('blocks COD when no courier on the lane collects cash', async () => {
    mockRate.mockImplementation(async (args) => (args.cod ? null : DELHIVERY));
    expect((await price({})).cod_block).toBe('NOT_SERVICEABLE');
  });

  it('gives the prepaid discount only to a prepaid order', async () => {
    const noida = await seedWarehouse('DUN-WH-NOIDA', '201301');
    const quote = await priceStoreCart({
      lines: [jerky(noida._id)],
      settings: settings({ free_shipping_above: 499, prepaid_discount_pct: 5 }),
      pincode: GURUGRAM_PIN,
      paymentMethod: 'PREPAID',
    });
    // 5% of ₹698, whole rupees.
    expect(quote.prepaid_discount).toBe(34);
    expect(quote.cod_fee).toBe(0);
    expect(quote.quote.total).toBe(664);
  });
});
