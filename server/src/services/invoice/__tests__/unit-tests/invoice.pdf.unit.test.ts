import { generateInvoicePdf, type InvoiceData } from '@services/invoice/invoice.pdf';

const base: InvoiceData = {
  invoice_no: 'DUN/2627/000001',
  invoice_date: new Date('2026-07-04T10:00:00Z'),
  customer_name: 'Riya Sharma',
  customer_email: 'riya@x.com',
  customer_phone: '+91 9876543210',
  business_name: 'Duncit',
  business_address: '1 HQ Road, Pune',
  business_gstin: '27AAAAA0000A1Z5',
  currency_symbol: '₹',
  items: [{ description: 'Pod booking · Sunset Pod', qty: 1, unit_price: 847.46, amount: 847.46 }],
  subtotal: 847.46,
  gst_amount: 152.54,
  gst_pct: 18,
  total: 1000,
  payment_id: 'pay_abc',
  payment_method: 'Razorpay',
};

const isPdf = (b: Buffer) => b.length > 800 && b.subarray(0, 5).toString() === '%PDF-';

describe('generateInvoicePdf bill-to block', () => {
  it('renders a full bill-to with GSTIN + billing email + multi-line address', async () => {
    const pdf = await generateInvoicePdf({
      ...base,
      customer_billing_email: 'accounts@company.com',
      customer_gstin: '27ABCDE1234F1Z5',
      customer_address_lines: ['12 MG Road', 'Flat 4B, Near Metro', 'Pune, Maharashtra - 411001', 'India'],
    });
    expect(isPdf(pdf)).toBe(true);
  });

  it('still renders when no address lines / GSTIN are provided (legacy)', async () => {
    const pdf = await generateInvoicePdf(base);
    expect(isPdf(pdf)).toBe(true);
  });

  it('renders with an empty items list and no contact', async () => {
    const pdf = await generateInvoicePdf({
      ...base,
      customer_phone: undefined,
      customer_email: '',
      items: [],
      customer_address_lines: ['  ', 'Only Line'],
    });
    expect(isPdf(pdf)).toBe(true);
  });
});
