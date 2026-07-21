import { Types } from 'mongoose';
import { productOrderService } from '../../productOrder.service';
import { ProductOrderModel } from '../../productOrder.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';

let seq = 0;

async function seedProduct(overrides: Record<string, any> = {}) {
  return InventoryProductModel.create({
    product_name: 'T-Shirt',
    sku: `SKU-${++seq}`,
    unit_cost: 300,
    ownership: 'DUNCIT',
    weight_kg: 0.3,
    length_cm: 25,
    breadth_cm: 20,
    height_cm: 3,
    ...overrides,
  });
}

async function seedPayment(product_lines: any[], meta: Record<string, any> = {}) {
  return PaymentModel.create({
    payment_id: `pay-${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Buyer',
    user_email: 'buyer@x.com',
    user_phone: '+91 9000000000',
    subtotal: 1000,
    total: 1000,
    currency_symbol: '₹',
    metadata: { product_lines, ...meta },
  });
}

describe('productOrderService.createFromPayment', () => {
  it('splits SHIP vs PICKUP into separate orders and enriches line items', async () => {
    const p1 = await seedProduct({ product_name: 'T-Shirt', unit_cost: 300 });
    const p2 = await seedProduct({ product_name: 'Mug', unit_cost: 150, ownership: 'BRAND' });
    const payment = await seedPayment(
      [
        { product_id: String(p1._id), name: 'T-Shirt', quantity: 2, unit_cost: 300, gross: 600, fulfilment_method: 'SHIP' },
        { product_id: String(p2._id), name: 'Mug', quantity: 1, unit_cost: 150, gross: 150, fulfilment_method: 'PICKUP' },
      ],
      {
        fulfilment_method: 'PICKUP',
        shipping_address: { name: 'Buyer', line1: '1 A Rd', city: 'Pune', state: 'MH', pincode: '411001', phone: '9000000000' },
      }
    );

    const orders = await productOrderService.createFromPayment(payment);
    expect(orders).toHaveLength(2);

    const ship = orders.find((o) => o.fulfilment_method === 'SHIP')!;
    const pickup = orders.find((o) => o.fulfilment_method === 'PICKUP')!;

    // SHIP: awaiting shipment (ShipRocket unconfigured → no live call), address kept, dims enriched.
    expect(ship.fulfilment_status).toBe('AWAITING_SHIPMENT');
    expect(ship.shipping_address?.city).toBe('Pune');
    expect(ship.items_total).toBe(600);
    expect(ship.line_items[0].ownership).toBe('DUNCIT');
    expect(ship.line_items[0].weight_kg).toBe(0.3);
    expect(ship.order_no).toMatch(/^ord_/);

    // PICKUP: pending with a pickup code; brand-owned line enriched.
    expect(pickup.fulfilment_status).toBe('PENDING');
    expect(pickup.pickup_ref).toMatch(/^PU-/);
    expect(pickup.line_items[0].ownership).toBe('BRAND');
  });

  it('routes a SHIPROCKET-delivery product to a SHIP order regardless of the checkout method', async () => {
    const product = await seedProduct({ product_name: 'Boxed kit', delivery_target: 'SHIPROCKET' });
    const payment = await seedPayment(
      [{ product_id: String(product._id), name: 'Boxed kit', quantity: 1, unit_cost: 300, gross: 300 }],
      {
        fulfilment_method: 'PICKUP',
        shipping_address: { name: 'Buyer', line1: '1 A Rd', city: 'Pune', state: 'MH', pincode: '411001', phone: '9000000000' },
      }
    );

    const orders = await productOrderService.createFromPayment(payment);
    expect(orders).toHaveLength(1);
    expect(orders[0].fulfilment_method).toBe('SHIP');
    expect(orders[0].fulfilment_status).toBe('AWAITING_SHIPMENT');
  });

  it('is idempotent on (payment, method)', async () => {
    const p1 = await seedProduct();
    const payment = await seedPayment(
      [{ product_id: String(p1._id), name: 'T', quantity: 1, unit_cost: 300, gross: 300 }],
      { fulfilment_method: 'PICKUP' }
    );
    await productOrderService.createFromPayment(payment);
    await productOrderService.createFromPayment(payment);
    const count = await ProductOrderModel.countDocuments({ payment_id: payment._id });
    expect(count).toBe(1);
  });

  it('returns [] when the payment has no product lines', async () => {
    const payment = await seedPayment([], { fulfilment_method: 'PICKUP' });
    expect(await productOrderService.createFromPayment(payment)).toEqual([]);
  });

  it('captures the bought variant on the order line and uses its dims for the parcel', async () => {
    const product = await seedProduct({
      product_name: 'Hoodie',
      inventory_count: 10,
      variants: [
        { option_label: 'S / Red', sku: 'VAR-S-RED', unit_cost: 500, inventory_count: 4, weight_kg: 0.4, length_cm: 30, breadth_cm: 25, height_cm: 4, images: ['http://x/red.jpg'] },
        { option_label: 'L / Blue', sku: 'VAR-L-BLUE', unit_cost: 550, inventory_count: 6, weight_kg: 0.5, length_cm: 32, breadth_cm: 27, height_cm: 5, images: ['http://x/blue.jpg'] },
      ],
    });
    const variant = (product as any).variants[1];
    const payment = await seedPayment(
      [
        {
          product_id: String(product._id),
          variant_id: String(variant._id),
          variant_label: 'L / Blue',
          variant_sku: 'VAR-L-BLUE',
          name: 'Hoodie',
          quantity: 2,
          unit_cost: 550,
          gross: 1100,
        },
      ],
      { fulfilment_method: 'PICKUP' }
    );

    const orders = await productOrderService.createFromPayment(payment);
    expect(orders).toHaveLength(1);
    const line = orders[0].line_items[0];
    expect(line.variant_id).toBe(String(variant._id));
    expect(line.variant_label).toBe('L / Blue');
    expect(line.variant_sku).toBe('VAR-L-BLUE');
    expect(line.unit_cost).toBe(550);
    // Parcel data comes from the bought variant, not the flat mirror.
    expect(line.weight_kg).toBe(0.5);
    expect(line.image_url).toBe('http://x/blue.jpg');
  });

  it('decrements product + variant stock at order creation, exactly once', async () => {
    const product = await seedProduct({
      product_name: 'Cap',
      inventory_count: 9,
      variants: [
        { option_label: 'Red', sku: 'CAP-RED', unit_cost: 200, inventory_count: 5 },
        { option_label: 'Blue', sku: 'CAP-BLUE', unit_cost: 220, inventory_count: 4 },
      ],
    });
    const variant = (product as any).variants[0];
    const payment = await seedPayment(
      [
        {
          product_id: String(product._id),
          variant_id: String(variant._id),
          variant_label: 'Red',
          name: 'Cap',
          quantity: 3,
          unit_cost: 200,
          gross: 600,
        },
      ],
      { fulfilment_method: 'PICKUP' }
    );

    await productOrderService.createFromPayment(payment);
    // Re-entrant finalize must not double-decrement (idempotent on the order).
    await productOrderService.createFromPayment(payment);

    const after: any = await InventoryProductModel.findById(product._id);
    expect(after.inventory_count).toBe(6);
    const afterVariant = after.variants.find((v: any) => String(v._id) === String(variant._id));
    expect(afterVariant.inventory_count).toBe(2);
  });
});

describe('productOrderService.table', () => {
  async function seedOrder(overrides: Record<string, any> = {}) {
    return ProductOrderModel.create({
      order_no: `ord_${++seq}`,
      buyer_id: new Types.ObjectId(),
      buyer_name: 'Buyer',
      buyer_email: 'buyer@x.com',
      payment_id: new Types.ObjectId(),
      items_total: 100,
      total: 100,
      fulfilment_method: 'PICKUP',
      ...overrides,
    });
  }

  it('serves the productOrdersTable page with search, filter, sort and paging', async () => {
    await seedOrder({ order_no: 'ord_alpha', buyer_name: 'Asha', total: 300, fulfilment_method: 'SHIP', fulfilment_status: 'AWAITING_SHIPMENT' });
    await seedOrder({ order_no: 'ord_beta', buyer_name: 'Bela', total: 100 });
    await seedOrder({ order_no: 'ord_gamma', buyer_name: 'Gita', total: 200 });

    // Plain envelope with the clamp defaults.
    const all = await productOrderService.table();
    expect(all.total).toBe(3);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans order_no and buyer fields.
    const byNo = await productOrderService.table({ search: 'ord_beta' });
    expect(byNo.rows.map((o) => o.order_no)).toEqual(['ord_beta']);
    const byBuyer = await productOrderService.table({ search: 'gita' });
    expect(byBuyer.rows.map((o) => o.buyer_name)).toEqual(['Gita']);

    // Enum filter narrows.
    const ship = await productOrderService.table({
      filters: [{ field: 'fulfilment_method', op: 'eq', value: 'SHIP' }],
    });
    expect(ship.rows.map((o) => o.order_no)).toEqual(['ord_alpha']);
    expect(ship.total).toBe(1);

    // Allowlisted numeric sort.
    const byTotal = await productOrderService.table({ sort_by: 'total', sort_dir: 'asc' });
    expect(byTotal.rows.map((o) => o.total)).toEqual([100, 200, 300]);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await productOrderService.table({ page: 2, page_size: 1, sort_by: 'order_no', sort_dir: 'asc' });
    expect(page2.rows.map((o) => o.order_no)).toEqual(['ord_beta']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });
});
