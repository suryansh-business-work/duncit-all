jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@services/invoice/invoice.pdf', () => ({
  generateInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
}));
jest.mock('../../razorpay.gateway', () => ({
  getRazorpayKeys: jest.fn().mockResolvedValue({ keyId: 'rzp_test', keySecret: 's' }),
  createRazorpayOrder: jest.fn().mockResolvedValue({ id: 'order_test_1' }),
  verifyRazorpaySignature: jest.fn(),
}));

import { Types } from 'mongoose';
import { paymentService } from '../../payment.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';

let seq = 0;
const seedUser = () =>
  UserModel.create({ auth: { email: `pc${++seq}@x.com` }, profile: { first_name: 'Cart', last_name: 'Buyer' } });

const seedWarehouse = (nickname: string, pincode: string) =>
  BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname, pincode });

const seedShipProduct = (warehouseId: any, over: Record<string, unknown> = {}) =>
  InventoryProductModel.create({
    product_name: 'Shipped Item',
    sku: `SKU-${++seq}`,
    unit_cost: 300,
    inventory_count: 100,
    delivery_target: 'SHIPROCKET',
    pickup_location_id: warehouseId,
    weight_kg: 1,
    delivery_charge: 40,
    ownership: 'DUNCIT',
    ...over,
  });

const seedPodFor = (productId: any, unitCost = 300) =>
  PodModel.create({
    pod_id: `pcpod-${++seq}`,
    pod_title: 'Cart Pod',
    pod_hosts_id: [new Types.ObjectId()],
    club_id: new Types.ObjectId(),
    pod_description: 'd',
    pod_date_time: new Date(Date.now() + 86400_000),
    pod_type: 'NON_NATIVE_PAID',
    pod_amount: 500,
    products_enabled: true,
    product_requests: [
      { product_id: productId, product_name: 'Shipped Item', unit_cost: unitCost, quantity: 10, total_cost: unitCost * 10 },
    ],
  });

const shipAddress = {
  name: 'Cart Buyer', phone: '+91 9876543210', email: 'buyer@x.com',
  line1: '1 A Rd', line2: '', landmark: '', city: 'Pune', state: 'MH', pincode: '560001', country: 'India',
};

const cartInput = (items: any[], over: Record<string, any> = {}) => ({
  items,
  contact_email: 'buyer@x.com',
  contact_phone_extension: '+91',
  contact_phone_number: '9876543210',
  billing: { line1: '1 A Rd', city: 'Pune', state: 'MH', pincode: '411001' },
  checkout_url: 'https://app/cart/checkout',
  shipping_address: shipAddress,
  ...over,
});

const ordersFor = (paymentId: string) => ProductOrderModel.find({ payment_id: new Types.ObjectId(paymentId) });

describe('standalone product checkout', () => {
  it('charges products + fallback delivery, marks the payment PRODUCT, does NOT book the pod, and splits per warehouse', async () => {
    const user = await seedUser();
    const wh = await seedWarehouse('WH-A', '110001');
    const product = await seedShipProduct(wh._id, { delivery_charge: 40 });
    const pod = await seedPodFor(product._id, 300);

    const res = await paymentService.dummyProductCheckout(
      cartInput([{ product_id: String(product._id), pod_id: String(pod._id), quantity: 2 }]),
      String(user._id)
    );

    // Products 600 + fallback delivery 40 (ShipRocket unconfigured in tests) = 640 gross.
    expect(res.target_type).toBe('PRODUCT');
    expect(res.total).toBe(640);
    expect(res.pod_id).toBeNull();

    // A product purchase never books the pod.
    const freshPod = await PodModel.findById(pod._id);
    expect(freshPod?.pod_attendees ?? []).toHaveLength(0);

    const orders = await ordersFor(res.id);
    expect(orders).toHaveLength(1);
    expect(orders[0].fulfilment_method).toBe('SHIP');
    expect(orders[0].shipping_charge).toBe(40);
    expect(orders[0].total).toBe(orders[0].items_total + 40);
    expect(orders[0].pickup_location_id).toBe('WH-A');
    expect(String(orders[0].pod_id)).toBe(String(pod._id));
  });

  it('makes one payment but a product order per pod for a multi-pod cart', async () => {
    const user = await seedUser();
    const wh = await seedWarehouse('WH-B', '110002');
    const productA = await seedShipProduct(wh._id);
    const productB = await seedShipProduct(wh._id);
    const podA = await seedPodFor(productA._id);
    const podB = await seedPodFor(productB._id);

    const res = await paymentService.dummyProductCheckout(
      cartInput([
        { product_id: String(productA._id), pod_id: String(podA._id), quantity: 1 },
        { product_id: String(productB._id), pod_id: String(podB._id), quantity: 1 },
      ]),
      String(user._id)
    );

    const orders = await ordersFor(res.id);
    expect(orders).toHaveLength(2);
    expect(new Set(orders.map((o) => String(o.pod_id)))).toEqual(
      new Set([String(podA._id), String(podB._id)])
    );
  });

  it('splits one pod cart into a SHIP order per warehouse, each with its own delivery charge', async () => {
    const user = await seedUser();
    const whA = await seedWarehouse('WH-H', '110008');
    const whB = await seedWarehouse('WH-I', '110009');
    const prodA = await seedShipProduct(whA._id, { delivery_charge: 40 });
    const prodB = await seedShipProduct(whB._id, { delivery_charge: 60 });
    const pod = await PodModel.create({
      pod_id: `pcpod-${++seq}`,
      pod_title: 'Multi WH Pod',
      pod_hosts_id: [new Types.ObjectId()],
      club_id: new Types.ObjectId(),
      pod_description: 'd',
      pod_date_time: new Date(Date.now() + 86400_000),
      pod_type: 'NON_NATIVE_PAID',
      pod_amount: 500,
      products_enabled: true,
      product_requests: [
        { product_id: prodA._id, product_name: 'A', unit_cost: 300, quantity: 10, total_cost: 3000 },
        { product_id: prodB._id, product_name: 'B', unit_cost: 300, quantity: 10, total_cost: 3000 },
      ],
    });

    const res = await paymentService.dummyProductCheckout(
      cartInput([
        { product_id: String(prodA._id), pod_id: String(pod._id), quantity: 1 },
        { product_id: String(prodB._id), pod_id: String(pod._id), quantity: 1 },
      ]),
      String(user._id)
    );

    const orders = await ordersFor(res.id);
    expect(orders).toHaveLength(2);
    const chargeByWarehouse = new Map(orders.map((o) => [o.pickup_location_id, o.shipping_charge]));
    expect(chargeByWarehouse.get('WH-H')).toBe(40);
    expect(chargeByWarehouse.get('WH-I')).toBe(60);
    // 600 products + 100 delivery (40 + 60) = 700.
    expect(res.total).toBe(700);
  });

  it('requires a delivery address when any product ships', async () => {
    const user = await seedUser();
    const wh = await seedWarehouse('WH-C', '110003');
    const product = await seedShipProduct(wh._id);
    const pod = await seedPodFor(product._id);
    await expect(
      paymentService.dummyProductCheckout(
        cartInput([{ product_id: String(product._id), pod_id: String(pod._id), quantity: 1 }], { shipping_address: null }),
        String(user._id)
      )
    ).rejects.toThrow(/delivery address is required/i);
  });

  it('rejects an empty cart and an invalid coupon', async () => {
    const user = await seedUser();
    await expect(paymentService.dummyProductCheckout(cartInput([]), String(user._id))).rejects.toThrow(/cart is empty/i);

    const wh = await seedWarehouse('WH-D', '110004');
    const product = await seedShipProduct(wh._id);
    const pod = await seedPodFor(product._id);
    await expect(
      paymentService.dummyProductCheckout(
        cartInput([{ product_id: String(product._id), pod_id: String(pod._id), quantity: 1 }], { coupon_code: 'NOPE' }),
        String(user._id)
      )
    ).rejects.toThrow(/coupon/i);
  });

  it('records a FAILED payment without creating orders on simulate_failure', async () => {
    const user = await seedUser();
    const wh = await seedWarehouse('WH-E', '110005');
    const product = await seedShipProduct(wh._id);
    const pod = await seedPodFor(product._id);
    const res = await paymentService.dummyProductCheckout(
      cartInput([{ product_id: String(product._id), pod_id: String(pod._id), quantity: 1 }], { simulate_failure: true }),
      String(user._id)
    );
    expect(res.status).toBe('FAILED');
    expect(await ordersFor(res.id)).toHaveLength(0);
  });

  it('opens a Razorpay sheet + PENDING payment for the live product flow (orders wait for verify)', async () => {
    const user = await seedUser();
    const wh = await seedWarehouse('WH-G', '110007');
    const product = await seedShipProduct(wh._id);
    const pod = await seedPodFor(product._id);
    const sheet = await paymentService.createRazorpayProductCheckout(
      cartInput([{ product_id: String(product._id), pod_id: String(pod._id), quantity: 1 }]),
      String(user._id)
    );
    expect(sheet.order_id).toBe('order_test_1');
    expect(sheet.free).toBe(false);
    expect(sheet.total).toBe(340); // 300 product + 40 delivery
    expect(await ordersFor(sheet.payment_doc_id)).toHaveLength(0);
  });

  it('previews a fallback shipping quote', async () => {
    const wh = await seedWarehouse('WH-F', '110006');
    const product = await seedShipProduct(wh._id, { delivery_charge: 55 });
    const pod = await seedPodFor(product._id);
    const quote = await paymentService.productShippingQuote({
      items: [{ product_id: String(product._id), pod_id: String(pod._id), quantity: 3 }],
      delivery_pincode: '560001',
    });
    expect(quote.total).toBe(55);
    expect(quote.all_quoted).toBe(false);
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0].charge).toBe(55);
    expect(quote.lines[0].free).toBe(false);
  });

  describe('free-delivery threshold (free_delivery_above)', () => {
    it('waives the warehouse delivery charge when the line meets the product threshold', async () => {
      const user = await seedUser();
      const wh = await seedWarehouse('WH-FREE-A', '110010');
      const product = await seedShipProduct(wh._id, { free_delivery_above: 500 });
      const pod = await seedPodFor(product._id, 300);

      // 2 × ₹300 = ₹600 ≥ ₹500 → products only, no delivery charge.
      const res = await paymentService.dummyProductCheckout(
        cartInput([{ product_id: String(product._id), pod_id: String(pod._id), quantity: 2 }]),
        String(user._id)
      );
      expect(res.total).toBe(600);

      const orders = await ordersFor(res.id);
      expect(orders).toHaveLength(1);
      expect(orders[0].shipping_charge).toBe(0);
      expect(orders[0].total).toBe(orders[0].items_total);
    });

    it('still charges delivery while the line is below the threshold', async () => {
      const user = await seedUser();
      const wh = await seedWarehouse('WH-FREE-B', '110011');
      const product = await seedShipProduct(wh._id, { free_delivery_above: 500 });
      const pod = await seedPodFor(product._id, 300);

      // 1 × ₹300 = ₹300 < ₹500 → the ₹40 fallback delivery applies.
      const res = await paymentService.dummyProductCheckout(
        cartInput([{ product_id: String(product._id), pod_id: String(pod._id), quantity: 1 }]),
        String(user._id)
      );
      expect(res.total).toBe(340);
      const orders = await ordersFor(res.id);
      expect(orders[0].shipping_charge).toBe(40);
    });

    it('previews per-warehouse free vs charged lines in the shipping quote', async () => {
      const whFree = await seedWarehouse('WH-FREE-C', '110012');
      const whPaid = await seedWarehouse('WH-FREE-D', '110013');
      const freeProduct = await seedShipProduct(whFree._id, { free_delivery_above: 300 });
      const paidProduct = await seedShipProduct(whPaid._id, { delivery_charge: 40 });
      const pod = await PodModel.create({
        pod_id: `pcpod-${++seq}`,
        pod_title: 'Free vs paid pod',
        pod_hosts_id: [new Types.ObjectId()],
        club_id: new Types.ObjectId(),
        pod_description: 'd',
        pod_date_time: new Date(Date.now() + 86400_000),
        pod_type: 'NON_NATIVE_PAID',
        pod_amount: 500,
        products_enabled: true,
        product_requests: [
          { product_id: freeProduct._id, product_name: 'F', unit_cost: 300, quantity: 10, total_cost: 3000 },
          { product_id: paidProduct._id, product_name: 'P', unit_cost: 300, quantity: 10, total_cost: 3000 },
        ],
      });

      const quote = await paymentService.productShippingQuote({
        items: [
          { product_id: String(freeProduct._id), pod_id: String(pod._id), quantity: 1 },
          { product_id: String(paidProduct._id), pod_id: String(pod._id), quantity: 1 },
        ],
        delivery_pincode: '560001',
      });
      expect(quote.total).toBe(40);
      expect(quote.lines).toHaveLength(2);
      const byWarehouse = new Map(quote.lines.map((line: any) => [line.warehouse_id, line]));
      expect(byWarehouse.get(String(whFree._id))).toMatchObject({ charge: 0, quoted: true, free: true });
      expect(byWarehouse.get(String(whPaid._id))).toMatchObject({ charge: 40, quoted: false, free: false });
    });
  });
});
