/**
 * The per-seller product invoice for products sold on a completed pod.
 *
 * Money is printed as "INR 1000.00" because Helvetica has no ₹ glyph (it came
 * out as a stray mark), and a line under the totals says which currency that
 * is. A product name that wraps makes its row taller, so it never runs across
 * the divider into the next product.
 */
import { capturePdfText, drawnOnce, helveticaHeight } from '@test/pdf-text';
import { generateProductInvoicePdf, type ProductInvoiceData } from '../../product-invoice.pdf';

const base: ProductInvoiceData = {
  title: 'PRODUCT INVOICE',
  invoice_no: 'DUN/PRD/000042',
  invoice_date: new Date('2026-10-01T10:00:00Z'),
  pod_title: 'Sunset Pod',
  seller_name: 'Asha Crafts',
  seller_email: 'asha@crafts.in',
  business_name: 'Duncit',
  business_address: '1 HQ Road, Pune',
  business_gstin: '27AAAAA0000A1Z5',
  currency_symbol: '₹',
  items: [
    { name: 'Clay mug', qty: 2, unit_cost: 500, gross: 1000, commission_pct: 10, commission: 100, net: 900 },
  ],
  gross_total: 1000,
  commission_total: 100,
  net_total: 900,
};

// A4 is 595.28pt wide and the invoice keeps a 48pt margin on each side.
const RIGHT_EDGE = 595.28 - 48;
const NAME_WIDTH = 196;
const LONG_NAME =
  'Hand-thrown stoneware coffee mug with a speckled glaze, gift wrapped with a card and a set of two coasters';

const drawn = (data: ProductInvoiceData) => capturePdfText(() => generateProductInvoicePdf(data));

describe('generateProductInvoicePdf', () => {
  it('renders a PDF', async () => {
    const pdf = await generateProductInvoicePdf(base);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('prints every amount as INR text, never the ₹ glyph', async () => {
    const text = await drawn(base);

    expect(text.some((entry) => entry.text.includes('₹'))).toBe(false);
    expect(text.map((entry) => entry.text)).toEqual(expect.arrayContaining(['INR 1000.00', 'INR 900.00']));
  });

  it('says in words which currency the amounts are in', async () => {
    const text = await drawn(base);

    drawnOnce(text, 'All amounts are in Indian Rupees (INR).');
  });

  it('prints no currency line for a symbol it cannot word, and keeps that symbol', async () => {
    const text = await drawn({ ...base, currency_symbol: '€' });

    expect(text.map((entry) => entry.text)).toContain('€900.00');
    expect(text.some((entry) => entry.text.startsWith('All amounts are in'))).toBe(false);
  });

  it('keeps the NET column and the totals inside the header band', async () => {
    const text = await drawn(base);
    const header = drawnOnce(text, 'NET');
    const grossTotal = text.filter((entry) => entry.text === 'INR 1000.00');

    expect(header.x + (header.width ?? 0)).toBeLessThan(RIGHT_EDGE);
    for (const cell of grossTotal) {
      expect(cell.x + (cell.width ?? 0)).toBeLessThan(RIGHT_EDGE);
    }
  });

  describe('a product name that wraps', () => {
    const twoProducts = (firstName: string): ProductInvoiceData => ({
      ...base,
      items: [
        { ...base.items[0], name: firstName },
        { name: 'Second product', qty: 1, unit_cost: 100, gross: 100, commission_pct: 10, commission: 10, net: 90 },
      ],
    });

    it('pushes the next row down by exactly the extra lines it takes', async () => {
      const short = drawnOnce(await drawn(twoProducts('Mug')), 'Second product');
      const wrapped = drawnOnce(await drawn(twoProducts(LONG_NAME)), 'Second product');

      const extra = helveticaHeight(LONG_NAME, NAME_WIDTH, 9.5) - helveticaHeight('Mug', NAME_WIDTH, 9.5);
      expect(extra).toBeGreaterThan(0);
      expect(wrapped.y - short.y).toBeCloseTo(extra, 5);
    });

    it('never starts the next row inside the wrapped name', async () => {
      const text = await drawn(twoProducts(LONG_NAME));
      const first = drawnOnce(text, LONG_NAME);
      const second = drawnOnce(text, 'Second product');

      expect(second.y).toBeGreaterThanOrEqual(first.y + helveticaHeight(LONG_NAME, NAME_WIDTH, 9.5));
    });
  });

  it('prints the terms and a custom footer when they are set', async () => {
    const text = await drawn({ ...base, invoice_terms: 'Payable in 7 days.', invoice_footer_note: 'Thanks!' });

    drawnOnce(text, 'Payable in 7 days.');
    drawnOnce(text, 'Thanks!');
  });
});
