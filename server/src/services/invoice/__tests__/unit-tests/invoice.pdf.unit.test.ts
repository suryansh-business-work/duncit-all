import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import {
  INVOICE_PAGE,
  drawInvoice,
  generateInvoicePdf,
  invoiceLogo,
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

/** Every string drawn for `data`, in order. */
const texts = async (data: InvoiceData) => (await drawn(data)).map((entry) => entry.text);

/** The business name drawn on the header band (the meta row prints it again lower down). */
const headerName = (text: readonly { text: string; x: number; y: number }[]) =>
  text.filter((entry) => entry.text === 'Duncit' && entry.y === 36);

describe('generateInvoicePdf totals block', () => {
  it('prints the multi-ticket discount row with its percentage and ticket count', async () => {
    const text = await texts({
      ...base,
      ticket_discount_pct: 10,
      ticket_discount_amount: 94.16,
      ticket_discount_tickets: 3,
    });

    expect(text).toEqual(expect.arrayContaining(['Multi-ticket discount (10% on 3 tickets)', '- INR 94.16']));
  });

  it('prints zeros for a discount whose percentage and ticket count were not frozen', async () => {
    const text = await texts({ ...base, ticket_discount_amount: 50 });

    expect(text).toEqual(expect.arrayContaining(['Multi-ticket discount (0% on 0 tickets)', '- INR 50.00']));
  });

  it('prints no discount row when the discount amount is zero or negative', async () => {
    const zero = await texts({ ...base, ticket_discount_amount: 0, ticket_discount_pct: 10 });
    const negative = await texts({ ...base, ticket_discount_amount: -5, ticket_discount_pct: 10 });

    expect(zero.some((t) => t.startsWith('Multi-ticket discount'))).toBe(false);
    expect(negative.some((t) => t.startsWith('Multi-ticket discount'))).toBe(false);
  });

  it('prints the round-off row only when rounding added something', async () => {
    const withRound = await texts({ ...base, round_off: 0.4 });
    const without = await texts({ ...base, round_off: 0 });

    expect(withRound).toEqual(expect.arrayContaining(['Round off', '+ INR 0.40']));
    expect(without).not.toContain('Round off');
  });

  it('prints both coin rows, flooring fractional coins', async () => {
    const text = await texts({ ...base, coins_redeemed: 40.9, coins_earned: 12 });

    expect(text).toEqual(expect.arrayContaining(['Duncit Coins used', '- 40', 'Duncit Coins earned', '+ 12']));
  });

  it('prints only the coin half that is non-zero', async () => {
    const spentOnly = await texts({ ...base, coins_redeemed: 5, coins_earned: 0 });
    const earnedOnly = await texts({ ...base, coins_redeemed: 0, coins_earned: 7 });

    expect(spentOnly).toContain('Duncit Coins used');
    expect(spentOnly).not.toContain('Duncit Coins earned');
    expect(earnedOnly).toContain('Duncit Coins earned');
    expect(earnedOnly).not.toContain('Duncit Coins used');
  });

  it('prints no coin rows when no coins moved', async () => {
    const text = await texts(base);

    expect(text.some((t) => t.startsWith('Duncit Coins'))).toBe(false);
  });
});

describe('generateInvoicePdf header, meta and footer', () => {
  it('uses the configured label, support contacts, terms and footer note', async () => {
    const text = await texts({
      ...base,
      invoice_label: 'RECEIPT',
      invoice_support_email: 'help@duncit.com',
      invoice_support_phone: '+91 90000 00000',
      invoice_terms: 'Refunds within 7 days.',
      invoice_footer_note: 'Thanks for booking!',
    });

    expect(text).toEqual(
      expect.arrayContaining([
        'RECEIPT',
        'Email: help@duncit.com   ·   Phone: +91 90000 00000',
        'Terms',
        'Refunds within 7 days.',
        'Thanks for booking!',
      ])
    );
    expect(text).not.toContain('TAX INVOICE');
    expect(text).not.toContain('This is a computer-generated invoice and does not require a signature.');
  });

  it('prints just the support phone when no support email is set', async () => {
    const text = await texts({ ...base, invoice_support_phone: '+91 90000 00000' });

    expect(text).toContain('Phone: +91 90000 00000');
    expect(text.some((t) => t.startsWith('Email:'))).toBe(false);
  });

  it('falls back to the default label and footer, with no terms block', async () => {
    const text = await texts(base);

    expect(text).toEqual(
      expect.arrayContaining(['TAX INVOICE', 'This is a computer-generated invoice and does not require a signature.'])
    );
    expect(text).not.toContain('Terms');
  });

  it('skips the business address and GSTIN lines when they are blank', async () => {
    const text = await texts({ ...base, business_address: '', business_gstin: '' });

    expect(text).not.toContain('1 HQ Road, Pune');
    expect(text).not.toContain('GSTIN: 27AAAAA0000A1Z5');
  });

  it('places the business name beside a logo that pdfkit can embed', async () => {
    const logo = fs.readFileSync(path.resolve(__dirname, '../../../_assets/duncit-mark-white.png'));
    const text = await capturePdfText(() => {
      const doc = new PDFDocument(INVOICE_PAGE);
      drawInvoice(doc, base, logo);
      doc.end();
    });

    expect(headerName(text)).toEqual([expect.objectContaining({ x: 48 + 54 })]);
  });

  it('falls back to the left margin when the logo bytes are not an image pdfkit can read', async () => {
    const text = await capturePdfText(() => {
      const doc = new PDFDocument(INVOICE_PAGE);
      drawInvoice(doc, base, Buffer.from('not an image'));
      doc.end();
    });

    expect(headerName(text)).toEqual([expect.objectContaining({ x: 48 })]);
  });
});

describe('invoiceLogo', () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns null without fetching when no logo URL is configured', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(invoiceLogo(undefined)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the served bytes', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([7, 8, 9]).buffer,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(invoiceLogo('https://cdn.example/logo.png')).resolves.toEqual(Buffer.from([7, 8, 9]));
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example/logo.png');
  });

  it('returns null on a non-OK response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    await expect(invoiceLogo('https://cdn.example/gone.png')).resolves.toBeNull();
  });

  it('returns null when the fetch throws', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('DNS')) as unknown as typeof fetch;

    await expect(invoiceLogo('https://nowhere.invalid/logo.png')).resolves.toBeNull();
  });

  it('still renders the invoice when the configured logo cannot be fetched', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('DNS')) as unknown as typeof fetch;

    const pdf = await generateInvoicePdf({ ...base, invoice_logo_url: 'https://nowhere.invalid/logo.png' });

    expect(isPdf(pdf)).toBe(true);
  });
});

describe('generateInvoicePdf failure', () => {
  it('rejects instead of hanging when drawing throws', async () => {
    await expect(generateInvoicePdf({ ...base, subtotal: undefined as unknown as number })).rejects.toBeInstanceOf(
      TypeError
    );
  });
});

describe('invoice brand mark missing from the bundle', () => {
  it('draws no image and puts the business name at the left margin', async () => {
    const realRead = fs.readFileSync;
    const readSpy = jest.spyOn(fs, 'readFileSync').mockImplementation(((
      file: fs.PathOrFileDescriptor,
      options?: unknown
    ) => {
      if (String(file).includes('duncit-mark-white')) throw new Error('ENOENT');
      return realRead(file, options as never);
    }) as typeof fs.readFileSync);
    let isolated: typeof import('@services/invoice/invoice.pdf') | undefined;
    try {
      jest.isolateModules(() => {
        isolated = require('@services/invoice/invoice.pdf') as typeof import('@services/invoice/invoice.pdf');
      });
    } finally {
      readSpy.mockRestore();
    }
    if (!isolated) throw new Error('invoice.pdf did not load');
    const drawWithoutMark = isolated.drawInvoice;

    const doc = new PDFDocument(INVOICE_PAGE);
    const imageSpy = jest.spyOn(doc, 'image');
    const text = await capturePdfText(() => {
      drawWithoutMark(doc, base, null);
      doc.end();
    });

    expect(imageSpy).not.toHaveBeenCalled();
    expect(headerName(text)).toEqual([expect.objectContaining({ x: 48 })]);
  });
});
