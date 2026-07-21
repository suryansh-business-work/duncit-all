jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@services/invoice/invoice.pdf', () => ({
  generateInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
}));
// dummyCheckout books the pod, which fires a fire-and-forget event-ticket email
// (ticketService.ensureForMembership). Stub it so that floating promise never
// touches Mongo after this suite tears down.
jest.mock('@modules/pods/ticket/ticket.service', () => ({
  ticketService: { ensureForMembership: jest.fn().mockResolvedValue(null) },
}));

import { Types } from 'mongoose';
import { paymentService } from '../../payment.service';
import { PaymentModel } from '../../payment.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';

let seq = 0;

async function seedUser() {
  return UserModel.create({
    auth: { email: `vbuyer${++seq}@x.com` },
    profile: { first_name: 'Variant', last_name: 'Buyer' },
  });
}

async function seedVariantProduct(overrides: Record<string, any> = {}) {
  return InventoryProductModel.create({
    product_name: 'Hoodie',
    sku: `VSKU-${++seq}`,
    unit_cost: 500,
    inventory_count: 10,
    ownership: 'BRAND',
    variants: [
      { option_label: 'S / Red', sku: 'V-S-RED', unit_cost: 500, inventory_count: 4 },
      { option_label: 'L / Blue', sku: 'V-L-BLUE', unit_cost: 650, inventory_count: 2 },
    ],
    ...overrides,
  });
}

async function seedPodWith(product: any, row: Record<string, any> = {}) {
  return PodModel.create({
    pod_id: `vpod-${++seq}`,
    pod_title: 'Variant Pod',
    pod_hosts_id: [new Types.ObjectId()],
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_date_time: new Date(Date.now() + 86400_000),
    pod_type: 'NON_NATIVE_PAID',
    pod_amount: 1000,
    products_enabled: true,
    product_requests: [
      {
        product_id: product._id,
        product_name: product.product_name,
        unit_cost: 500,
        quantity: 5,
        total_cost: 2500,
        ...row,
      },
    ],
  });
}

const buyInput = (podId: Types.ObjectId, selected: any[], extra: Record<string, any> = {}) => ({
  pod_id: String(podId),
  amount: 1000,
  contact_email: 'buyer@x.com',
  contact_phone_extension: '+91',
  contact_phone_number: '9876543210',
  billing: { line1: '1 A Rd', city: 'Pune', state: 'MH', pincode: '411001' },
  checkout_url: 'https://app/checkout',
  selected_products: selected,
  ...extra,
});

describe('variant-aware checkout pricing', () => {
  it('charges the chosen variant price and snapshots it onto product_lines', async () => {
    const user = await seedUser();
    const product = await seedVariantProduct();
    const pod = await seedPodWith(product);
    const blue = (product as any).variants[1];

    const res = await paymentService.dummyCheckout(
      buyInput(pod._id, [{ product_id: String(product._id), variant_id: String(blue._id), quantity: 2 }]),
      String(user._id)
    );
    // Payable = 1000 ticket + 2 × 650 (variant price, NOT the ₹500 snapshot).
    expect(res.total).toBe(2300);

    const doc: any = await PaymentModel.findById(res.id);
    const line = doc.metadata.product_lines[0];
    expect(line.variant_id).toBe(String(blue._id));
    expect(line.variant_label).toBe('L / Blue');
    expect(line.variant_sku).toBe('V-L-BLUE');
    expect(line.unit_cost).toBe(650);
    expect(line.gross).toBe(1300);
  });

  it('rejects a quantity above the variant stock and unknown variants', async () => {
    const user = await seedUser();
    const product = await seedVariantProduct();
    const pod = await seedPodWith(product);
    const blue = (product as any).variants[1]; // stock 2

    await expect(
      paymentService.dummyCheckout(
        buyInput(pod._id, [{ product_id: String(product._id), variant_id: String(blue._id), quantity: 3 }]),
        String(user._id)
      )
    ).rejects.toThrow(/only 2 .*in stock/i);

    await expect(
      paymentService.dummyCheckout(
        buyInput(pod._id, [
          { product_id: String(product._id), variant_id: String(new Types.ObjectId()), quantity: 1 },
        ]),
        String(user._id)
      )
    ).rejects.toThrow(/variant is no longer available/i);
  });

  it("gates on the pod's remaining units (stocked − sold)", async () => {
    const user = await seedUser();
    const product = await seedVariantProduct();
    // 5 stocked, 4 already sold → only 1 remaining.
    const pod = await seedPodWith(product, { sold_count: 4 });

    await expect(
      paymentService.dummyCheckout(
        buyInput(pod._id, [{ product_id: String(product._id), quantity: 2 }]),
        String(user._id)
      )
    ).rejects.toThrow(/only 1 hoodie available/i);
  });

  it('requires a delivery address when a selected product ships via ShipRocket', async () => {
    const user = await seedUser();
    const product = await seedVariantProduct({ delivery_target: 'SHIPROCKET' });
    const pod = await seedPodWith(product);

    await expect(
      paymentService.dummyCheckout(
        buyInput(pod._id, [{ product_id: String(product._id), quantity: 1 }]),
        String(user._id)
      )
    ).rejects.toThrow(/delivery address is required/i);

    // With an address the same checkout goes through.
    const res = await paymentService.dummyCheckout(
      buyInput(pod._id, [{ product_id: String(product._id), quantity: 1 }], {
        shipping_address: {
          name: 'Buyer',
          phone: '9876543210',
          line1: '1 A Rd',
          city: 'Pune',
          state: 'MH',
          pincode: '411001',
        },
      }),
      String(user._id)
    );
    expect(res.status).toBe('SUCCESS');
  });
});
