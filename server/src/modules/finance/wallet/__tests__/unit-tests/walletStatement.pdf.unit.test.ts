import { walletStatementPdf, type StatementBranding } from '../../walletStatement.pdf';
import type { WalletStatement, WalletStatementRow } from '../../walletStatement.service';

/**
 * The statement PDF is built by hand, page by page. These render the real
 * document and read the structure back: how many pages a statement runs to,
 * whether the logo was embedded, and that every page carries its footer.
 */

// A 1x1 PNG, the smallest image pdfkit will embed.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const branding = (over: Partial<StatementBranding> = {}): StatementBranding => ({
  business_name: 'Duncit',
  business_address: '1 Main Road, Pune',
  business_gstin: '27ABCDE1234F1Z5',
  support_email: 'help@duncit.test',
  support_phone: '+91 00000 00000',
  logo_url: '',
  ...over,
});

const row = (i: number, over: Partial<WalletStatementRow> = {}): WalletStatementRow => ({
  id: `r${i}`,
  occurred_at: '2025-01-02T09:00:00.000Z',
  kind: 'POD_COMPLETION',
  reference: `rel-${i}`,
  description: `Earning credit - Host payout - Pod number ${i}`,
  debit: i % 2 ? 0 : 10,
  credit: i % 2 ? 10 : 0,
  balance: i * 10,
  status: 'CREDITED',
  ...over,
});

const statement = (rows: WalletStatementRow[], over: Partial<WalletStatement> = {}): WalletStatement => ({
  account_name: 'Asha Rao',
  account_email: 'a@x.com',
  currency_symbol: '₹',
  time_zone: 'Asia/Kolkata',
  period_from: '2025-01-01',
  period_to: '2025-01-31',
  generated_at: '2025-02-01T00:00:00.000Z',
  balances_reconciled: true,
  opening_balance: 0,
  closing_balance: 100,
  rows,
  totals: {
    transaction_count: rows.length,
    total_credits: 100,
    total_debits: 0,
    earnings_credited: 100,
    withdrawals_requested: 0,
    withdrawals_paid: 0,
    withdrawals_pending: 0,
    withdrawals_rejected: 0,
    reversals_credited: 0,
  },
  ...over,
});

const pages = (pdf: Buffer) => Number(/\/Type \/Pages[\s\S]*?\/Count (\d+)/.exec(pdf.toString('latin1'))?.[1]);
const rowsOf = (n: number) => Array.from({ length: n }, (_, i) => row(i + 1));
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: false });
  global.fetch = fetchMock as never;
});

describe('walletStatementPdf', () => {
  it('prints a short statement on one page', async () => {
    const pdf = await walletStatementPdf(statement(rowsOf(3)), branding());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pages(pdf)).toBe(1);
    expect(pdf.toString('latin1')).not.toContain('/Subtype /Image');
  });

  it('prints an empty period, with no address or GSTIN when the business has none', async () => {
    const pdf = await walletStatementPdf(
      statement([], { opening_balance: 0, closing_balance: 0 }),
      branding({ business_address: '', business_gstin: '', support_email: '', support_phone: '' })
    );
    expect(pages(pdf)).toBe(1);
  });

  it('keeps the summary whole by moving it to its own page when it does not fit under the rows', async () => {
    const fits = await walletStatementPdf(statement(rowsOf(3)), branding());
    const spills = await walletStatementPdf(statement(rowsOf(11)), branding());
    expect(pages(fits)).toBe(1);
    expect(pages(spills)).toBe(2);
  });

  it('runs a long statement onto further pages and keeps the table header on each', async () => {
    const pdf = await walletStatementPdf(statement(rowsOf(60)), branding());
    expect(pages(pdf)).toBeGreaterThanOrEqual(3);
    const longer = await walletStatementPdf(statement(rowsOf(120)), branding());
    expect(pages(longer)).toBeGreaterThan(pages(pdf));
  });

  it('prints a statement whose ledger did not reconcile, with no balance column', async () => {
    const rows = rowsOf(2).map((r) => ({ ...r, balance: null }));
    const withBalances = await walletStatementPdf(statement(rows.map((r, i) => ({ ...r, balance: i }))), branding());
    const withheld = await walletStatementPdf(
      statement(rows, { balances_reconciled: false, opening_balance: null, closing_balance: null }),
      branding()
    );
    expect(pages(withheld)).toBe(1);
    // The withheld version carries the explanation, so it is a different document.
    expect(withheld.equals(withBalances)).toBe(false);
  });

  it('embeds the logo when it can be fetched', async () => {
    fetchMock.mockResolvedValue({ ok: true, arrayBuffer: async () => PNG.buffer.slice(PNG.byteOffset, PNG.byteOffset + PNG.byteLength) });
    const pdf = await walletStatementPdf(statement(rowsOf(1)), branding({ logo_url: 'https://cdn.duncit.test/logo.png' }));
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.duncit.test/logo.png');
    expect(pdf.toString('latin1')).toContain('/Subtype /Image');
  });

  it('falls back to the business name when the logo is not an image, or cannot be fetched', async () => {
    const junk = Buffer.from('this is not an image');
    fetchMock.mockResolvedValue({ ok: true, arrayBuffer: async () => junk.buffer.slice(junk.byteOffset, junk.byteOffset + junk.byteLength) });
    const broken = await walletStatementPdf(statement(rowsOf(1)), branding({ logo_url: 'https://cdn.duncit.test/x.png' }));
    expect(pages(broken)).toBe(1);
    expect(broken.toString('latin1')).not.toContain('/Subtype /Image');

    fetchMock.mockRejectedValue(new Error('network down'));
    const offline = await walletStatementPdf(statement(rowsOf(1)), branding({ logo_url: 'https://cdn.duncit.test/x.png' }));
    expect(pages(offline)).toBe(1);
  });
});
