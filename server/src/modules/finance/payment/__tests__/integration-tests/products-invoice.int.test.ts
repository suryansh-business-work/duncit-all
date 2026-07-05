jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@services/invoice/invoice.pdf', () => ({
  generateInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
}));
// dummyCheckout books the pod, which fires a fire-and-forget event-ticket email
// (ticketService.ensureForMembership). Stub it so that floating promise never
// touches Mongo after this suite tears down ("Cannot log after tests are done").
jest.mock('@modules/pods/ticket/ticket.service', () => ({
  ticketService: { ensureForMembership: jest.fn().mockResolvedValue(null) },
}));

import { Types } from 'mongoose';
import { paymentService } from '../../payment.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { generateInvoicePdf } from '@services/invoice/invoice.pdf';

const mockPdf = generateInvoicePdf as jest.Mock;
const round2 = (n: number) => Math.round(n * 100) / 100;

let seq = 0;

async function seedUser() {
  return UserModel.create({
    auth: { email: `pbuyer${++seq}@x.com` },
    profile: { first_name: 'Prod', last_name: 'Buyer' },
  });
}

async function seedPodWithProducts() {
  const p1 = new Types.ObjectId();
  const p2 = new Types.ObjectId();
  const pod = await PodModel.create({
    pod_id: `ppod-${++seq}`,
    pod_title: 'Market Pod',
    pod_hosts_id: [new Types.ObjectId()],
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_date_time: new Date(Date.now() + 86400_000),
    pod_type: 'NON_NATIVE_PAID',
    pod_amount: 1000,
    products_enabled: true,
    product_requests: [
      { product_id: p1, product_name: 'T-Shirt', unit_cost: 300, quantity: 5, total_cost: 1500 },
      { product_id: p2, product_name: 'Mug', unit_cost: 150, quantity: 10, total_cost: 1500 },
    ],
  });
  return { pod, p1, p2 };
}

const buyInput = (podId: Types.ObjectId, selected: any[]) => ({
  pod_id: String(podId),
  amount: 1000,
  contact_email: 'buyer@x.com',
  contact_phone_extension: '+91',
  contact_phone_number: '9876543210',
  billing: { line1: '1 A Rd', city: 'Pune', state: 'MH', pincode: '411001' },
  checkout_url: 'https://app/checkout',
  selected_products: selected,
});

beforeEach(() => mockPdf.mockClear());

describe('invoice itemization with products', () => {
  it('adds an Event ticket line + one line per product, summing to the subtotal', async () => {
    const user = await seedUser();
    const { pod, p1, p2 } = await seedPodWithProducts();
    const res = await paymentService.dummyCheckout(
      buyInput(pod._id, [
        { product_id: String(p1), quantity: 2 }, // 600
        { product_id: String(p2), quantity: 1 }, // 150
      ]),
      String(user._id)
    );
    // Payable = 1000 ticket + 750 products = 1750 gross; server recomputed.
    expect(res.total).toBe(1750);

    const inv = mockPdf.mock.calls[0][0];
    const descs = inv.items.map((i: any) => i.description);
    expect(descs).toEqual(['Event ticket', 'T-Shirt', 'Mug']);
    // Lines sum to the (net) subtotal exactly.
    const sum = round2(inv.items.reduce((s: number, i: any) => s + i.amount, 0));
    expect(sum).toBe(round2(inv.subtotal));
    // Product lines carry their quantities.
    expect(inv.items.find((i: any) => i.description === 'T-Shirt').qty).toBe(2);
    expect(inv.items.find((i: any) => i.description === 'Mug').qty).toBe(1);
  });

  it('keeps a single line when no products are selected', async () => {
    const user = await seedUser();
    const { pod } = await seedPodWithProducts();
    await paymentService.dummyCheckout(buyInput(pod._id, []), String(user._id));
    const inv = mockPdf.mock.calls[0][0];
    expect(inv.items).toHaveLength(1);
    expect(inv.items[0].amount).toBe(inv.subtotal);
  });
});
