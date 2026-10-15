import PDFDocument from 'pdfkit';
import { capturePdfText, drawnOnce } from '@test/pdf-text';
import { invoiceTitle, renderVenueFoodInvoice, taxNote, type FoodInvoiceData } from '../../venueFoodInvoice.pdf';

/**
 * The venue's own invoice for a food order: what it prints for a full bill and
 * a bare one, and how a long order spills onto further pages without the
 * totals being split from each other. The real pdfkit lays every page out.
 */

/** pdfkit's typings describe the instance only; the drawing methods live on the class prototype. */
const pdfPrototype = (PDFDocument as unknown as { prototype: PDFKit.PDFDocument }).prototype;

/** The page's left margin, where a continued table head and continued totals start. */
const LEFT = 48;

const line = (n: number) => ({ name: `Dish ${n}`, quantity: 1, unit: 100, total: 100 });

/** A bill with nothing optional on it. */
const bare: FoodInvoiceData = {
  invoice_no: 'FOOD-000001',
  issued_at: new Date('2026-10-01T12:00:00Z'),
  venue_name: 'Cafe Uno',
  venue_address: '',
  venue_gstin: '',
  customer_name: 'Asha Rao',
  customer_phone: '9876543210',
  table_label: '',
  currency_symbol: '$',
  lines: [line(1)],
  subtotal: 100,
  discount_pct: 0,
  discount: 0,
  coupon_code: '',
  coupon_discount: 0,
  tax_mode: 'INCLUSIVE',
  gst_pct: 0,
  taxable: 100,
  cgst: 0,
  sgst: 0,
  total: 100,
  payment_reference: '',
  refund_note: '',
};

const full: FoodInvoiceData = {
  ...bare,
  venue_address: '12 MG Road, Pune',
  venue_gstin: '27ABCDE1234F1Z5',
  venue_fssai: '12345678901234',
  table_label: 'Patio 2',
  currency_symbol: '₹',
  subtotal: 500,
  discount_pct: 10,
  discount: 50,
  coupon_code: 'WELCOME20',
  coupon_discount: 90,
  tax_mode: 'EXCLUSIVE',
  gst_pct: 5,
  taxable: 360,
  cgst: 9,
  sgst: 9,
  total: 378,
  payment_reference: 'pay_abc123',
  refund_note: 'This order was cancelled and refunded in full.',
};

const texts = async (data: FoodInvoiceData) => (await capturePdfText(() => renderVenueFoodInvoice(data))).map((d) => d.text);

/** Every string drawn, and how many pages were added, while one invoice rendered. */
async function render(data: FoodInvoiceData) {
  const addPage = jest.spyOn(pdfPrototype, 'addPage');
  try {
    let pdf: Buffer = Buffer.alloc(0);
    const drawn = await capturePdfText(async () => {
      pdf = await renderVenueFoodInvoice(data);
    });
    // The constructor adds the first page through the same method, so every page is counted.
    return { drawn, pages: addPage.mock.calls.length, pdf };
  } finally {
    addPage.mockRestore();
  }
}

describe('renderVenueFoodInvoice — what a bill prints', () => {
  it('prints every part of a full tax invoice: the venue, the table, both discounts, the GST halves and the payment', async () => {
    const drawn = await texts(full);
    expect(drawn).toEqual(
      expect.arrayContaining([
        'TAX INVOICE',
        '12 MG Road, Pune',
        'GSTIN: 27ABCDE1234F1Z5',
        'FSSAI Lic. No: 12345678901234',
        '9876543210  ·  Table Patio 2',
        'QR order discount (10%)',
        '- INR 50.00',
        'Coupon WELCOME20',
        '- INR 90.00',
        'Taxable value',
        'INR 360.00',
        'CGST (2.5%)',
        'SGST (2.5%)',
        'INR 378.00',
        'GST added to prices.',
        'All amounts are in Indian Rupees (INR).',
        'Paid online · Payment reference: pay_abc123',
        'This order was cancelled and refunded in full.',
      ])
    );
  });

  it('prints a bare bill as a plain invoice with none of the optional lines', async () => {
    const drawn = await texts(bare);
    expect(drawn).toContain('INVOICE');
    expect(drawn).not.toContain('TAX INVOICE');
    expect(drawn).toContain('9876543210');
    expect(drawn).toContain('Prices are inclusive of all applicable taxes.');
    for (const prefix of ['GSTIN', 'FSSAI', 'QR order discount', 'Coupon', 'Taxable value', 'CGST', 'SGST', 'All amounts are in', 'Paid online']) {
      expect(drawn.some((text) => text.startsWith(prefix))).toBe(false);
    }
    // A currency the built-in font can draw passes through untouched.
    expect(drawn).toContain('$100.00');
  });
});

describe('renderVenueFoodInvoice — long orders', () => {
  it('keeps a short order and its totals on one page', async () => {
    const { pages, drawn } = await render({ ...bare, lines: [line(1), line(2), line(3)] });
    expect(pages).toBe(1);
    expect(drawn.filter((entry) => entry.text === 'ITEM')).toHaveLength(1);
  });

  it('continues the item table on a new page under its own head when the first page is full', async () => {
    const { pages, drawn, pdf } = await render({ ...bare, lines: Array.from({ length: 34 }, (_, index) => line(index + 1)) });
    expect(pages).toBe(2);
    const heads = drawn.filter((entry) => entry.text === 'ITEM');
    expect(heads).toHaveLength(2);
    expect(heads[1].y).toBe(LEFT + 6);
    // Every dish is still listed once.
    for (let n = 1; n <= 34; n += 1) drawnOnce(drawn, `Dish ${n}`);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('moves the totals to a new page rather than split them from each other at the foot of the table', async () => {
    const { pages, drawn } = await render({ ...bare, lines: Array.from({ length: 20 }, (_, index) => line(index + 1)) });
    expect(pages).toBe(2);
    // The table did not need a second page; only the totals did, starting at the top margin.
    expect(drawn.filter((entry) => entry.text === 'ITEM')).toHaveLength(1);
    expect(drawnOnce(drawn, 'Subtotal').y).toBe(LEFT + 10);
  });
});

describe('invoiceTitle and taxNote', () => {
  it('titles a TAX INVOICE only with both a GSTIN and a GST charged', () => {
    expect(invoiceTitle({ venue_gstin: '27ABCDE1234F1Z5', gst_pct: 5 })).toBe('TAX INVOICE');
    expect(invoiceTitle({ venue_gstin: '27ABCDE1234F1Z5', gst_pct: 0 })).toBe('INVOICE');
    expect(invoiceTitle({ venue_gstin: '', gst_pct: 5 })).toBe('INVOICE');
  });

  it('says how the prices meet the GST', () => {
    expect(taxNote({ tax_mode: 'INCLUSIVE', gst_pct: 5 })).toBe('Prices include GST.');
    expect(taxNote({ tax_mode: 'EXCLUSIVE', gst_pct: 5 })).toBe('GST added to prices.');
    expect(taxNote({ tax_mode: 'EXCLUSIVE', gst_pct: 0 })).toBe('Prices are inclusive of all applicable taxes.');
  });
});
