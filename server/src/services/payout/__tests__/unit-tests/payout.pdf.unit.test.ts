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
