jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@services/invoice/invoice.pdf', () => ({
  generateInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
}));

import { Types } from 'mongoose';
import { paymentService } from '../../payment.service';
import { PaymentModel } from '../../payment.model';
import { UserModel } from '@modules/access/user/user.model';
import { generateInvoicePdf } from '@services/invoice/invoice.pdf';

const mockPdf = generateInvoicePdf as jest.Mock;

let seq = 0;
async function seedUser(over: Record<string, any> = {}) {
  return UserModel.create({
    auth: { email: `buyer${++seq}@x.com` },
    profile: { first_name: 'Profile', last_name: 'Name' },
    ...over,
  });
}

const structuredBilling = {
  gstin: '27ABCDE1234F1Z5',
  line1: '12 MG Road',
  line2: 'Flat 4B',
  landmark: 'Near Metro',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  country: 'India',
};

const baseInput = (over: Record<string, any> = {}) => ({
  amount: 1000,
  contact_email: 'contact@x.com',
  contact_phone_extension: '+91',
  contact_phone_number: '9876543210',
  checkout_url: 'https://app/checkout',
  ...over,
});

beforeEach(() => mockPdf.mockClear());

describe('checkout billing (structured)', () => {
  it('persists the structured billing block and composes the legacy string', async () => {
    const user = await seedUser();
    const res = await paymentService.dummyCheckout(
      baseInput({ contact_name: 'Riya Sharma', billing: structuredBilling }),
      String(user._id)
    );

    const doc = await PaymentModel.findById(res.id);
    expect(doc!.user_name).toBe('Riya Sharma'); // contact_name wins over profile
    expect(doc!.billing.line1).toBe('12 MG Road');
    expect(doc!.billing.city).toBe('Pune');
    expect(doc!.billing.pincode).toBe('411001');
    expect(doc!.billing.gstin).toBe('27ABCDE1234F1Z5');
    expect(doc!.billing.name).toBe('Riya Sharma');
    expect(doc!.billing.phone).toBe('+91 9876543210');
    // Legacy one-liner is composed from the structured parts.
    expect(doc!.billing_address).toBe(
      '12 MG Road, Flat 4B, Near Metro, Pune, Maharashtra, 411001, India'
    );

    // The invoice bill-to receives the address lines + GSTIN.
    const inv = mockPdf.mock.calls[0][0];
    expect(inv.customer_name).toBe('Riya Sharma');
    expect(inv.customer_gstin).toBe('27ABCDE1234F1Z5');
    expect(inv.customer_address_lines).toEqual([
      '12 MG Road',
      'Flat 4B, Near Metro',
      'Pune, Maharashtra - 411001',
      'India',
    ]);
  });

  it('falls back to the profile name and legacy free-text address', async () => {
    const user = await seedUser();
    const res = await paymentService.dummyCheckout(
      baseInput({ billing_address: '99 Old Street, Mumbai 400001' }),
      String(user._id)
    );
    const doc = await PaymentModel.findById(res.id);
    expect(doc!.user_name).toBe('Profile Name'); // no contact_name → profile
    expect(doc!.billing.line1).toBe('99 Old Street, Mumbai 400001'); // legacy → line1
    expect(doc!.billing_address).toBe('99 Old Street, Mumbai 400001');
    // Bill-to shows the free-text line + the default country row.
    expect(mockPdf.mock.calls[0][0].customer_address_lines).toEqual([
      '99 Old Street, Mumbai 400001',
      'India',
    ]);
  });

  it('saves a separate billing email and prints both on the invoice', async () => {
    const user = await seedUser();
    const res = await paymentService.dummyCheckout(
      baseInput({
        contact_name: 'Riya Sharma',
        contact_email: 'riya.personal@x.com',
        billing: { ...structuredBilling, email: 'accounts@company.com' },
      }),
      String(user._id)
    );
    const doc = await PaymentModel.findById(res.id);
    expect(doc!.user_email).toBe('riya.personal@x.com'); // main contact email
    expect(doc!.billing.email).toBe('accounts@company.com'); // separate billing email

    const inv = mockPdf.mock.calls[0][0];
    expect(inv.customer_email).toBe('riya.personal@x.com'); // contact
    expect(inv.customer_billing_email).toBe('accounts@company.com'); // billing — both on invoice
  });

  it('defaults the billing email to the contact email when not given', async () => {
    const user = await seedUser();
    const res = await paymentService.dummyCheckout(
      baseInput({ contact_email: 'solo@x.com', billing: structuredBilling }),
      String(user._id)
    );
    const doc = await PaymentModel.findById(res.id);
    expect(doc!.billing.email).toBe('solo@x.com');
    // Same email → no separate billing-email line on the invoice.
    expect(mockPdf.mock.calls[0][0].customer_billing_email).toBeUndefined();
  });

  it('exposes the billing block over the public shape', async () => {
    const user = await seedUser();
    const res = await paymentService.dummyCheckout(
      baseInput({ contact_name: 'Amit', billing: structuredBilling }),
      String(user._id)
    );
    expect(res.billing.city).toBe('Pune');
    expect(res.billing.gstin).toBe('27ABCDE1234F1Z5');
    // Old payments (no billing sub-doc) still return a full billing object.
    const legacy = await PaymentModel.create({
      payment_id: `pay_${Date.now()}`,
      user_id: new Types.ObjectId(),
      user_name: 'Legacy',
      user_email: 'legacy@x.com',
      billing_address: 'old',
      subtotal: 10,
      total: 10,
      status: 'SUCCESS',
    });
    const pub = await paymentService.getById(String(legacy._id));
    expect(pub!.billing.country).toBe('India');
    expect(pub!.billing.line1).toBe('');
  });
});
