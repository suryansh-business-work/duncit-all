import fs from 'node:fs';
import path from 'node:path';
import { capturePdfText, drawnOnce } from '@test/pdf-text';
import { generatePayoutPdf, type PayoutStatementData } from '../../payout.pdf';

const base: PayoutStatementData = {
  statement_type: 'HOST',
  release_id: 'rel_test123',
  statement_date: new Date('2026-06-13T00:00:00Z'),
  pod_title: 'Sunset Pod',
  beneficiary_name: 'Asha Host',
  beneficiary_email: 'asha@x.com',
  business_name: 'Duncit',
  business_address: '1 Test Street',
  business_gstin: '29ABCDE1234F1Z5',
  currency_symbol: '₹',
  collected_total: 5000,
  venue_bill: 1500,
  gst_pct: 18,
  gst_amount: 630,
  duncit_pct: 70,
  duncit_amount: 2009,
  payout_pct: 30,
  payout_amount: 861,
};

describe('generatePayoutPdf', () => {
  it('renders a host payout statement as a %PDF buffer', async () => {
    const pdf = await generatePayoutPdf(base);
    expect(pdf.length).toBeGreaterThan(500);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders a venue payout statement (leaner waterfall)', async () => {
    const pdf = await generatePayoutPdf({
      ...base,
      statement_type: 'VENUE',
      beneficiary_name: 'Sunset Cafe',
      duncit_pct: 20,
      duncit_amount: 246,
      payout_pct: 80,
      payout_amount: 984,
      gst_amount: 270,
      invoice_support_email: 'help@duncit.com',
      invoice_support_phone: '+91 99999 99999',
    });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });
});

describe('generatePayoutPdf currency', () => {
  // A4 is 595.28pt wide and the statement keeps a 48pt margin on each side.
  const RIGHT_EDGE = 595.28 - 48;
  const drawn = (data: PayoutStatementData) => capturePdfText(() => generatePayoutPdf(data));

  it('prints every amount as INR text, never the ₹ glyph Helvetica cannot draw', async () => {
    const text = await drawn(base);

    expect(text.some((entry) => entry.text.includes('₹'))).toBe(false);
    expect(text.map((entry) => entry.text)).toEqual(
      expect.arrayContaining(['INR 5000.00', '- INR 630.00', '- INR 2009.00', 'INR 861.00'])
    );
  });

  it('says in words which currency the amounts are in', async () => {
    const text = await drawn(base);

    drawnOnce(text, 'All amounts are in Indian Rupees (INR).');
  });

  it('prints no currency line for a symbol it cannot word, and keeps that symbol', async () => {
    const text = await drawn({ ...base, currency_symbol: '$' });

    expect(text.map((entry) => entry.text)).toContain('$861.00');
    expect(text.some((entry) => entry.text.startsWith('All amounts are in'))).toBe(false);
  });

  it('keeps the amount column inside the band, so the figures never touch its end', async () => {
    const text = await drawn(base);
    const header = drawnOnce(text, 'AMOUNT');
    const payout = drawnOnce(text, 'INR 861.00');

    expect(header.x + (header.width ?? 0)).toBeLessThan(RIGHT_EDGE);
    expect(payout.x + (payout.width ?? 0)).toBeLessThan(RIGHT_EDGE);
  });
});

describe('generatePayoutPdf header logo', () => {
  const realFetch = globalThis.fetch;
  const LOGO_URL = 'https://cdn.example/logo.png';
  const png = fs.readFileSync(path.resolve(__dirname, '../../../_assets/duncit-mark-white.png'));
  const drawn = (data: PayoutStatementData) => capturePdfText(() => generatePayoutPdf(data));
  /** The business name as the header wordmark (the meta block prints it again lower down). */
  const wordmark = (text: readonly { text: string; y: number }[]) =>
    text.filter((entry) => entry.text === 'Duncit' && entry.y === 30);
  const serve = (bytes: Buffer) =>
    jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('embeds the fetched logo instead of the wordmark', async () => {
    const fetchMock = serve(png);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const text = await drawn({ ...base, invoice_logo_url: LOGO_URL });

    expect(fetchMock).toHaveBeenCalledWith(LOGO_URL);
    expect(wordmark(text)).toHaveLength(0);
  });

  it('falls back to the wordmark when the fetched bytes are not an image', async () => {
    globalThis.fetch = serve(Buffer.from('<html>not a logo</html>')) as unknown as typeof fetch;

    const text = await drawn({ ...base, invoice_logo_url: LOGO_URL });

    expect(wordmark(text)).toHaveLength(1);
  });

  it('falls back to the wordmark when the logo URL answers non-OK', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    const text = await drawn({ ...base, invoice_logo_url: LOGO_URL });

    expect(wordmark(text)).toHaveLength(1);
  });

  it('falls back to the wordmark when the logo fetch throws', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('DNS')) as unknown as typeof fetch;

    const text = await drawn({ ...base, invoice_logo_url: LOGO_URL });

    expect(wordmark(text)).toHaveLength(1);
  });

  it('does not fetch at all when no logo URL is configured', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const text = await drawn(base);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wordmark(text)).toHaveLength(1);
  });
});

describe('generatePayoutPdf titles, terms and footer', () => {
  const texts = async (data: PayoutStatementData) =>
    (await capturePdfText(() => generatePayoutPdf(data))).map((entry) => entry.text);

  it('titles a host statement and labels the host as the payee', async () => {
    const text = await texts(base);

    expect(text).toEqual(expect.arrayContaining(['HOST PAYOUT', 'PAYABLE TO · HOST', 'Your Commission (30%)']));
  });

  it('titles a venue statement and labels the venue owner as the payee', async () => {
    const text = await texts({ ...base, statement_type: 'VENUE' });

    expect(text).toEqual(expect.arrayContaining(['VENUE PAYOUT', 'PAYABLE TO · VENUE OWNER', 'Your Payout (30%)']));
    expect(text).not.toContain('Total collected');
  });

  it('prefers the per-party template title, terms and footer note', async () => {
    const text = await texts({
      ...base,
      title: 'HOST SETTLEMENT',
      invoice_terms: 'Paid within 3 working days.',
      invoice_footer_note: 'Questions? Reply to this mail.',
    });

    expect(text).toEqual(
      expect.arrayContaining(['HOST SETTLEMENT', 'Terms', 'Paid within 3 working days.', 'Questions? Reply to this mail.'])
    );
    expect(text).not.toContain('HOST PAYOUT');
  });

  it('prints the default footer and no terms block when none are configured', async () => {
    const text = await texts(base);

    expect(text).toContain(
      'This payout statement is computer-generated and is shared once your pod completion is approved.'
    );
    expect(text).not.toContain('Terms');
  });

  it('prints just the support email when no phone is set, and skips blank business lines', async () => {
    const text = await texts({
      ...base,
      invoice_support_email: 'help@duncit.com',
      business_address: '',
      business_gstin: '',
    });

    expect(text).toContain('Email: help@duncit.com');
    expect(text.some((t) => t.startsWith('Phone:'))).toBe(false);
    expect(text).not.toContain('1 Test Street');
    expect(text.some((t) => t.startsWith('GSTIN:'))).toBe(false);
  });
});

describe('generatePayoutPdf failure', () => {
  it('rejects instead of hanging when a breakdown amount is missing', async () => {
    await expect(
      generatePayoutPdf({ ...base, collected_total: undefined as unknown as number })
    ).rejects.toBeInstanceOf(TypeError);
  });
});
