jest.mock('../../shiprocket.gateway', () => ({
  isShiprocketConfigured: jest.fn(),
  getServiceability: jest.fn(),
  createOrderAdhoc: jest.fn(),
  assignAwb: jest.fn(),
  trackByShipment: jest.fn(),
}));

import { Types } from 'mongoose';
import { shiprocketService } from '../../shiprocket.service';
import { isShiprocketConfigured, getServiceability } from '../../shiprocket.gateway';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { PodModel } from '@modules/pods/pod/pod.model';

const mockConfigured = isShiprocketConfigured as jest.Mock;
const mockServ = getServiceability as jest.Mock;

let seq = 0;
const seedWarehouse = () =>
  BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: `SQWH-${++seq}`, pincode: '110001' });
const seedShip = (warehouseId: any, over: Record<string, unknown> = {}) =>
  InventoryProductModel.create({
    product_name: 'Ship',
    sku: `SQ-${++seq}`,
    unit_cost: 100,
    delivery_target: 'SHIPROCKET',
    pickup_location_id: warehouseId,
    weight_kg: 1,
    delivery_charge: 30,
    ...over,
  });
const seedPod = (productId: any, snapshotUnitCost: number) =>
  PodModel.create({
    pod_id: `sqpod-${++seq}`,
    pod_title: 'Quote Pod',
    pod_hosts_id: [new Types.ObjectId()],
    club_id: new Types.ObjectId(),
    pod_description: 'd',
    pod_date_time: new Date(Date.now() + 86400_000),
    pod_type: 'NON_NATIVE_PAID',
    pod_amount: 500,
    products_enabled: true,
    product_requests: [
      {
        product_id: productId,
        product_name: 'Ship',
        unit_cost: snapshotUnitCost,
        quantity: 10,
        total_cost: snapshotUnitCost * 10,
      },
    ],
  });

describe('shiprocketService.quoteShipping', () => {
  it('returns zero for a cart with no shippable products', async () => {
    mockConfigured.mockResolvedValue(false);
    const pickupOnly = await InventoryProductModel.create({
      product_name: 'Pickup', sku: `SQ-${++seq}`, unit_cost: 100, delivery_target: 'HOST',
    });
    const quote = await shiprocketService.quoteShipping([{ product_id: String(pickupOnly._id), quantity: 1 }], '560001');
    expect(quote).toEqual({ total: 0, breakup: [], all_quoted: true });
  });

  it('returns zero when there are no valid product ids', async () => {
    const quote = await shiprocketService.quoteShipping([{ product_id: 'not-an-id', quantity: 1 }], '560001');
    expect(quote.total).toBe(0);
  });

  it('prices live from ShipRocket when serviceable (weight scales with quantity)', async () => {
    mockConfigured.mockResolvedValue(true);
    mockServ.mockResolvedValue({ serviceable: true, courier_name: 'Blue', courier_company_id: '1', freight_charge: 72.5, etd: '3' });
    const wh = await seedWarehouse();
    const product = await seedShip(wh._id, { weight_kg: 2, delivery_charge: 30 });
    const quote = await shiprocketService.quoteShipping([{ product_id: String(product._id), quantity: 2 }], '560001');
    expect(quote.total).toBe(72.5);
    expect(quote.all_quoted).toBe(true);
    expect(quote.breakup[0]).toMatchObject({ courier_name: 'Blue', charge: 72.5, quoted: true });
    expect(mockServ).toHaveBeenCalledWith(
      expect.objectContaining({ pickupPincode: '110001', deliveryPincode: '560001', weightKg: 4 })
    );
  });

  it('falls back to the manual delivery charge when ShipRocket has no quote', async () => {
    mockConfigured.mockResolvedValue(true);
    mockServ.mockResolvedValue(null);
    const wh = await seedWarehouse();
    const product = await seedShip(wh._id, { delivery_charge: 50 });
    const quote = await shiprocketService.quoteShipping([{ product_id: String(product._id), quantity: 1 }], '560001');
    expect(quote.total).toBe(50);
    expect(quote.breakup[0].quoted).toBe(false);
  });

  it('falls back to the manual delivery charge when ShipRocket errors', async () => {
    mockConfigured.mockResolvedValue(true);
    mockServ.mockRejectedValue(new Error('sr down'));
    const wh = await seedWarehouse();
    const product = await seedShip(wh._id, { delivery_charge: 45 });
    const quote = await shiprocketService.quoteShipping([{ product_id: String(product._id), quantity: 1 }], '560001');
    expect(quote.total).toBe(45);
    expect(quote.breakup[0].quoted).toBe(false);
    expect(quote.breakup[0].free).toBe(false);
  });
});

describe('shiprocketService.quoteShipping free-delivery threshold', () => {
  it('zeroes a group when the line meets the product threshold (no rate lookup)', async () => {
    mockConfigured.mockResolvedValue(true);
    const wh = await seedWarehouse();
    const product = await seedShip(wh._id, { free_delivery_above: 150 });
    // 2 × ₹100 = ₹200 ≥ ₹150 → the warehouse group ships free.
    const quote = await shiprocketService.quoteShipping([{ product_id: String(product._id), quantity: 2 }], '560001');
    expect(quote.total).toBe(0);
    expect(quote.all_quoted).toBe(true);
    expect(quote.breakup[0]).toMatchObject({ charge: 0, quoted: true, free: true, courier_name: '' });
    expect(mockServ).not.toHaveBeenCalled();
  });

  it('charges normally while the line is below the threshold', async () => {
    mockConfigured.mockResolvedValue(true);
    mockServ.mockResolvedValue({ serviceable: true, courier_name: 'Blue', courier_company_id: '1', freight_charge: 72.5, etd: '3' });
    const wh = await seedWarehouse();
    const product = await seedShip(wh._id, { free_delivery_above: 150 });
    // 1 × ₹100 = ₹100 < ₹150 → normal live quote applies.
    const quote = await shiprocketService.quoteShipping([{ product_id: String(product._id), quantity: 1 }], '560001');
    expect(quote.total).toBe(72.5);
    expect(quote.breakup[0]).toMatchObject({ charge: 72.5, quoted: true, free: false });
  });

  it('keeps the whole group paid when any line in the warehouse misses its threshold (mixed group)', async () => {
    mockConfigured.mockResolvedValue(false);
    const wh = await seedWarehouse();
    // Qualifying line (₹100 ≥ ₹100) + a no-threshold product (never qualifies).
    const qualifies = await seedShip(wh._id, { free_delivery_above: 100, delivery_charge: 30 });
    const noOffer = await seedShip(wh._id, { delivery_charge: 60 });
    const quote = await shiprocketService.quoteShipping(
      [
        { product_id: String(qualifies._id), quantity: 1 },
        { product_id: String(noOffer._id), quantity: 1 },
      ],
      '560001'
    );
    expect(quote.breakup).toHaveLength(1);
    expect(quote.breakup[0]).toMatchObject({ charge: 60, quoted: false, free: false });
  });

  it('qualifies a non-variant line by the pod snapshot unit_cost, not the live product price', async () => {
    mockConfigured.mockResolvedValue(false);
    const wh = await seedWarehouse();
    // Live ₹100 < ₹150 threshold, but the pod snapshot (what the buyer pays) is ₹200 ≥ ₹150 → free.
    const product = await seedShip(wh._id, { free_delivery_above: 150 });
    const pod = await seedPod(product._id, 200);
    const free = await shiprocketService.quoteShipping(
      [{ product_id: String(product._id), pod_id: String(pod._id), quantity: 1 }],
      '560001'
    );
    expect(free.breakup[0]).toMatchObject({ pod_id: String(pod._id), charge: 0, free: true });

    // Live ₹300 ≥ ₹150, but the snapshot the buyer is charged is ₹100 < ₹150 → still paid.
    const pricier = await seedShip(wh._id, { unit_cost: 300, free_delivery_above: 150 });
    const cheapPod = await seedPod(pricier._id, 100);
    const paid = await shiprocketService.quoteShipping(
      [{ product_id: String(pricier._id), pod_id: String(cheapPod._id), quantity: 1 }],
      '560001'
    );
    expect(paid.breakup[0]).toMatchObject({ charge: 30, free: false });
  });

  it('does NOT merge the same product across pods for the free-delivery threshold', async () => {
    mockConfigured.mockResolvedValue(false);
    const wh = await seedWarehouse();
    const product = await seedShip(wh._id, { free_delivery_above: 150 });
    const podA = await seedPod(product._id, 100);
    const podB = await seedPod(product._id, 100);
    // 1 + 1 across two pods would merge to ₹200 ≥ ₹150 if pooled — but each pod
    // ships separately, and each ₹100 line misses the threshold on its own.
    const quote = await shiprocketService.quoteShipping(
      [
        { product_id: String(product._id), pod_id: String(podA._id), quantity: 1 },
        { product_id: String(product._id), pod_id: String(podB._id), quantity: 1 },
      ],
      '560001'
    );
    expect(quote.breakup).toHaveLength(2);
    for (const line of quote.breakup) {
      expect(line).toMatchObject({ warehouse_id: String(wh._id), charge: 30, free: false });
    }
    expect(new Set(quote.breakup.map((l) => l.pod_id))).toEqual(
      new Set([String(podA._id), String(podB._id)])
    );
    expect(quote.total).toBe(60);
  });

  it('quotes one serviceability rate per (pod, warehouse) group — no combined-weight rate across pods', async () => {
    mockConfigured.mockResolvedValue(true);
    mockServ.mockResolvedValue({ serviceable: true, courier_name: 'Blue', courier_company_id: '1', freight_charge: 50, etd: '3' });
    const wh = await seedWarehouse();
    const productA = await seedShip(wh._id, { weight_kg: 2 });
    const productB = await seedShip(wh._id, { weight_kg: 3 });
    const podA = await seedPod(productA._id, 100);
    const podB = await seedPod(productB._id, 100);
    const quote = await shiprocketService.quoteShipping(
      [
        { product_id: String(productA._id), pod_id: String(podA._id), quantity: 1 },
        { product_id: String(productB._id), pod_id: String(podB._id), quantity: 1 },
      ],
      '560001'
    );
    expect(quote.breakup).toHaveLength(2);
    expect(quote.total).toBe(100);
    expect(mockServ).toHaveBeenCalledTimes(2);
    const weights = mockServ.mock.calls.map(([args]) => args.weightKg).sort((a, b) => a - b);
    expect(weights).toEqual([2, 3]);
  });

  it('prices a variant line by the variant unit_cost (variant price wins)', async () => {
    mockConfigured.mockResolvedValue(false);
    const wh = await seedWarehouse();
    const product = await seedShip(wh._id, {
      free_delivery_above: 350,
      variants: [{ option_label: 'Big', unit_cost: 200, inventory_count: 5, images: [] }],
    });
    const variantId = String(product.variants[0]._id);
    // 2 × variant ₹200 = ₹400 ≥ ₹350 → free (product-level ₹100 alone would not qualify).
    const met = await shiprocketService.quoteShipping(
      [{ product_id: String(product._id), variant_id: variantId, quantity: 2 }],
      '560001'
    );
    expect(met.breakup[0]).toMatchObject({ charge: 0, free: true });
    // 1 × ₹200 = ₹200 < ₹350 → the manual fallback still applies.
    const missed = await shiprocketService.quoteShipping(
      [{ product_id: String(product._id), variant_id: variantId, quantity: 1 }],
      '560001'
    );
    expect(missed.breakup[0]).toMatchObject({ charge: 30, free: false });
  });
});
