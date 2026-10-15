import PDFDocument from 'pdfkit';
import {
  INVOICE_PAGE,
  drawInvoice,
  generateInvoicePdf,
  type InvoiceData,
} from '@services/invoice/invoice.pdf';
import { capturePdfText, drawnOnce, helveticaHeight } from '@test/pdf-text';

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

/** Draw the invoice onto a fresh page and record every string handed to pdfkit. */
const drawn = (data: InvoiceData) =>
  capturePdfText(() => {
    const doc = new PDFDocument(INVOICE_PAGE);
    drawInvoice(doc, data, null);
    doc.end();
  });

// A4 is 595.28pt wide and the invoice keeps a 48pt margin on each side.
const RIGHT_EDGE = 595.28 - 48;
const DESC_WIDTH = 252;
const LONG_DESC =
  'Pod booking · Sunday sunset board games meetup at the riverside cafe, with snacks, ' +
  'two rounds of Catan and a long table reserved for the whole group until late';

describe('generateInvoicePdf currency', () => {
  it('prints rupee amounts as INR text, never the ₹ glyph Helvetica cannot draw', async () => {
    const text = await drawn(base);

    expect(text.some((entry) => entry.text.includes('₹'))).toBe(false);
    expect(text.map((entry) => entry.text)).toEqual(
      expect.arrayContaining(['INR 847.46', 'INR 152.54', 'INR 1000.00'])
    );
  });

  it('says in words which currency the amounts are in', async () => {
    const text = await drawn(base);

    drawnOnce(text, 'All amounts are in Indian Rupees (INR).');
  });

  it('keeps a drawable symbol as it is, and prints no currency line it cannot word', async () => {
    const text = await drawn({ ...base, currency_symbol: '$' });

    expect(text.map((entry) => entry.text)).toContain('$1000.00');
    expect(text.some((entry) => entry.text.startsWith('All amounts are in'))).toBe(false);
  });

  it('keeps the money column and the totals inside the header band', async () => {
    const text = await drawn(base);
    const amountHeader = drawnOnce(text, 'AMOUNT');
    const total = drawnOnce(text, 'INR 1000.00');

    expect(amountHeader.x + (amountHeader.width ?? 0)).toBeLessThan(RIGHT_EDGE);
    // Totals share the AMOUNT column's right edge, so they line up under it.
    expect(total.x + (total.width ?? 0)).toBe(amountHeader.x + (amountHeader.width ?? 0));
  });
});

describe('generateInvoicePdf line items', () => {
  const twoItems = (firstDescription: string): InvoiceData => ({
    ...base,
    items: [
      { description: firstDescription, qty: 1, unit_price: 500, amount: 500 },
      { description: 'Second item', qty: 2, unit_price: 250, amount: 500 },
    ],
  });

  it('pushes the next row down by exactly the extra lines a wrapped description takes', async () => {
    const short = drawnOnce(await drawn(twoItems('Short')), 'Second item');
    const wrapped = drawnOnce(await drawn(twoItems(LONG_DESC)), 'Second item');

    const extra = helveticaHeight(LONG_DESC, DESC_WIDTH, 10) - helveticaHeight('Short', DESC_WIDTH, 10);
    expect(extra).toBeGreaterThan(0);
    expect(wrapped.y - short.y).toBeCloseTo(extra, 5);
  });

  it('never starts the next row inside a wrapped description', async () => {
    const text = await drawn(twoItems(LONG_DESC));
    const first = drawnOnce(text, LONG_DESC);
    const second = drawnOnce(text, 'Second item');

    expect(second.y).toBeGreaterThanOrEqual(first.y + helveticaHeight(LONG_DESC, DESC_WIDTH, 10));
  });

  it('draws every cell of a row on the same line', async () => {
    const text = await drawn(twoItems(LONG_DESC));
    const first = drawnOnce(text, LONG_DESC);

    const rowCells = text.filter((entry) => entry.y === first.y).map((entry) => entry.text);
    expect(rowCells).toEqual([LONG_DESC, '1', 'INR 500.00', 'INR 500.00']);
  });
});
