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
