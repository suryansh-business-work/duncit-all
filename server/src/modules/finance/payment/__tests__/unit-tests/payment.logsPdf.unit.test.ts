import { paymentService } from '../../payment.service';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import {
  fetchPaymentLogRows,
  paymentLogsPdf,
  paymentLogsTitle,
  printableRow,
  renderPaymentLogsPdf,
  type PaymentLogsBranding,
  type PaymentLogsPdfData,
} from '../../payment.logsPdf';
import {
  PAYMENT_LOGS_PDF_MAX_ROWS,
  capLine,
  describeFilter,
  describeQuery,
  paymentRefundWord,
  paymentStatusWord,
  totalsOf,
  type PaymentLogRow,
} from '../../payment.logsPdf.words';

jest.mock('../../payment.service', () => ({
  paymentService: { table: jest.fn(), tableForShop: jest.fn() },
}));
jest.mock('@modules/finance/finance/finance.model', () => ({ getFinanceSettings: jest.fn() }));

const table = paymentService.table as unknown as jest.Mock;
const tableForShop = paymentService.tableForShop as unknown as jest.Mock;
const financeSettings = getFinanceSettings as unknown as jest.Mock;
const fetchMock = jest.fn();

const row = (i: number, over: Partial<PaymentLogRow> = {}): PaymentLogRow => ({
  id: `p${i}`,
  payment_id: `DPAY-${i}`,
  user_name: `Asha Rao ${i}`,
  user_email: `asha${i}@example.test`,
  description: `Pod booking ${i}`,
  total: 118,
  currency_symbol: '₹',
  status: 'SUCCESS',
  refund_status: null,
  needs_refund: false,
  razorpay_payment_id: `pay_${i}`,
  created_at: '2025-01-02T09:00:00.000Z',
  ...over,
});

const rowsOf = (n: number, start = 1) => Array.from({ length: n }, (_, i) => row(start + i));

const branding = (over: Partial<PaymentLogsBranding> = {}): PaymentLogsBranding => ({
  business_name: 'Duncit',
  logo_url: '',
  support_email: 'help@duncit.test',
  support_phone: '+91 00000 00000',
  ...over,
});

const data = (rows: PaymentLogRow[], over: Partial<PaymentLogsPdfData> = {}): PaymentLogsPdfData => ({
  title: 'Payment Logs',
  rows,
  total: rows.length,
  filters: 'None (every payment)',
  generated_at: new Date('2025-02-01T00:00:00.000Z'),
  ...over,
});

const pages = (pdf: Buffer) => Number(/\/Type \/Pages[\s\S]*?\/Count (\d+)/.exec(pdf.toString('latin1'))?.[1]);

beforeEach(() => {
  // clearMocks keeps implementations, and the paging tests set their own.
  table.mockReset();
  tableForShop.mockReset();
  financeSettings.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: false });
  global.fetch = fetchMock as never;
});

describe('paymentStatusWord', () => {
  it.each([
    ['SUCCESS', 'Paid'],
    ['PENDING', 'Pending'],
    ['FAILED', 'Failed'],
    ['REFUNDED', 'Refunded'],
  ])('reads %s as %s', (status, word) => {
    expect(paymentStatusWord(status)).toBe(word);
  });

  it('spells out a status it does not know instead of printing the raw code', () => {
    expect(paymentStatusWord('PARTIALLY_HELD')).toBe('Partially held');
  });
});

describe('paymentRefundWord', () => {
  it.each([
    ['a refund Razorpay confirmed on a refunded payment', { status: 'REFUNDED', refund_status: 'SUCCEEDED' }, 'Refunded'],
    ['a refund Razorpay confirmed on a payment that is still paid', { status: 'SUCCESS', refund_status: 'SUCCEEDED' }, 'Part refunded'],
    ['a refund Razorpay accepted but the bank has not confirmed', { status: 'REFUNDED', refund_status: 'PROCESSING' }, 'Refund processing'],
    ['a refund recorded and waiting to be sent', { status: 'REFUNDED', refund_status: 'REQUESTED' }, 'Refund pending'],
    ['a refund whose last send failed', { status: 'REFUNDED', refund_status: 'FAILED' }, 'Refund needs attention'],
    ['a refund whose retries are used up', { status: 'REFUNDED', refund_status: 'RECONCILIATION_REQUIRED' }, 'Refund needs attention'],
    ['a capture that bought nothing and is still owed back', { status: 'SUCCESS', refund_status: null, needs_refund: true }, 'Refund pending'],
    ['an older refund with no engine record', { status: 'REFUNDED', refund_status: null }, 'Refunded'],
    ['a refund with no gateway money to send', { status: 'REFUNDED', refund_status: 'NOT_APPLICABLE' }, 'Refunded'],
  ])('says %s in words', (_label, input, word) => {
    expect(paymentRefundWord(input)).toBe(word);
  });

  it('says nothing about a payment with no refund', () => {
    expect(paymentRefundWord({ status: 'SUCCESS', refund_status: null, needs_refund: false })).toBe('');
    expect(paymentRefundWord({ status: 'FAILED' })).toBe('');
  });

  it('keeps showing an owed refund as pending once Razorpay has not yet taken it', () => {
    expect(paymentRefundWord({ status: 'SUCCESS', refund_status: 'REQUESTED', needs_refund: true })).toBe('Refund pending');
  });
});

describe('describeQuery', () => {
  it('says "None" when there is no search and no filter', () => {
    expect(describeQuery(undefined)).toBe('None (every payment)');
    expect(describeQuery({ search: '   ', filters: [] })).toBe('None (every payment)');
  });

  it('prints the search and each filter in the words the table uses', () => {
    const summary = describeQuery({
      search: 'asha',
      filters: [
        { field: 'status', op: 'in', values: ['SUCCESS', 'REFUNDED'] },
        { field: 'total', op: 'gte', value: '100' },
        { field: 'created_at', op: 'between', values: ['2025-01-01T00:00:00.000Z', '2025-01-31T00:00:00.000Z'] },
      ],
    });
    expect(summary).toContain('Search "asha"');
    expect(summary).toContain('Status: Paid, Refunded');
    expect(summary).toContain('Amount: from 100');
    expect(summary).toMatch(/Date: .+ to .+/);
    expect(summary).not.toContain('2025-01-01T00:00:00.000Z');
  });

  it.each([
    [{ field: 'gateway', op: 'ne', value: 'DUMMY' }, 'Gateway: not DUMMY'],
    [{ field: 'description', op: 'contains', value: 'pod' }, 'What for: contains pod'],
    [{ field: 'total', op: 'lte', value: '500' }, 'Amount: up to 500'],
    [{ field: 'needs_refund', op: 'is_true' }, 'Needs refund: yes'],
    [{ field: 'needs_refund', op: 'is_false' }, 'Needs refund: no'],
    [{ field: 'status', op: 'eq', value: 'FAILED' }, 'Status: Failed'],
  ] as const)('describes %j', (filter, text) => {
    expect(describeFilter({ ...filter })).toBe(text);
  });
});

describe('capLine', () => {
  it('is silent when every matching payment is on the page', () => {
    expect(capLine(40, 40)).toBeNull();
    expect(capLine(0, 0)).toBeNull();
  });

  it('says how many of how many were printed when the list was cut', () => {
    expect(capLine(2000, 3456)).toBe('Showing the first 2000 of 3456 payments. Narrow the search or filters to print the rest.');
  });
});

describe('totalsOf', () => {
  it('adds paid and refunded money separately and counts failed and pending payments', () => {
    const [totals] = totalsOf([
      row(1, { total: 100.1 }),
      row(2, { total: 200.2 }),
      row(3, { total: 50, status: 'REFUNDED' }),
      row(4, { total: 70, status: 'FAILED' }),
      row(5, { total: 80, status: 'PENDING' }),
    ]);
    expect(totals).toEqual({
      symbol: '₹',
      paid_count: 2,
      paid: 300.3,
      refunded_count: 1,
      refunded: 50,
      failed_count: 1,
      pending_count: 1,
    });
  });

  it('never adds two currencies together', () => {
    const totals = totalsOf([row(1, { total: 100 }), row(2, { total: 5, currency_symbol: '$' })]);
    expect(totals.map((t) => [t.symbol, t.paid])).toEqual([
      ['₹', 100],
      ['$', 5],
    ]);
  });

  it('is empty for no rows', () => {
    expect(totalsOf([])).toEqual([]);
  });
});

describe('printableRow', () => {
  it('prints the rupee sign as INR, since the built-in PDF fonts cannot draw it', () => {
    const printed = printableRow(row(1, { total: 1180 }));
    expect(printed.amount).toBe('INR 1180.00');
    expect(printed.status).toBe('Paid');
    expect(printed.customer).toBe('Asha Rao 1\nasha1@example.test');
    expect(printed.razorpay).toBe('pay_1');
  });

  it('prints a dash where there is no refund or Razorpay id (a dummy-gateway payment)', () => {
    const printed = printableRow(row(1, { razorpay_payment_id: null }));
    expect(printed.razorpay).toBe('-');
    expect(printed.refund).toBe('-');
  });

  it('clips a very long description so one row cannot take a whole page', () => {
    const printed = printableRow(row(1, { description: 'x'.repeat(500) }));
    expect(printed.what.length).toBe(140);
    expect(printed.what.endsWith('...')).toBe(true);
  });

  it('shows the refund word for a refunded payment', () => {
    expect(printableRow(row(1, { status: 'REFUNDED', refund_status: 'PROCESSING' })).refund).toBe('Refund processing');
  });
});

describe('paymentLogsTitle', () => {
  it('names each shop on its own and never shares a heading between them', () => {
    expect(paymentLogsTitle()).toBe('Payment Logs');
    expect(paymentLogsTitle('POD_SHOP')).toBe('Pod Shop Payment Logs');
    expect(paymentLogsTitle('ECOMM')).toBe('Ecomm Payment Logs');
  });
});

describe('renderPaymentLogsPdf', () => {
  it('prints a short list on one landscape page', async () => {
    const pdf = await renderPaymentLogsPdf(data(rowsOf(3)), branding());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pages(pdf)).toBe(1);
    // A4 landscape is wider than it is tall.
    expect(/\/MediaBox \[0 0 841\.89 595\.28\]/.test(pdf.toString('latin1'))).toBe(true);
  });

  it('prints an empty result as a valid one-page document', async () => {
    const pdf = await renderPaymentLogsPdf(data([]), branding({ support_email: '', support_phone: '' }));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pages(pdf)).toBe(1);
  });

  it('runs a long list onto further pages, the more rows the more pages', async () => {
    const sixty = await renderPaymentLogsPdf(data(rowsOf(60)), branding());
    const oneTwenty = await renderPaymentLogsPdf(data(rowsOf(120)), branding());
    expect(pages(sixty)).toBeGreaterThanOrEqual(3);
    expect(pages(oneTwenty)).toBeGreaterThan(pages(sixty));
  });

  it('is a different document when the list was cut, because it says so', async () => {
    const whole = await renderPaymentLogsPdf(data(rowsOf(3)), branding());
    const cut = await renderPaymentLogsPdf(data(rowsOf(3), { total: 500 }), branding());
    expect(cut.equals(whole)).toBe(false);
  });

  it('embeds the logo when it can be fetched and falls back to the business name when not', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    fetchMock.mockResolvedValue({ ok: true, arrayBuffer: async () => png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) });
    const withLogo = await renderPaymentLogsPdf(data(rowsOf(1)), branding({ logo_url: 'https://cdn.duncit.test/logo.png' }));
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.duncit.test/logo.png');
    expect(withLogo.toString('latin1')).toContain('/Subtype /Image');

    fetchMock.mockRejectedValue(new Error('network down'));
    const offline = await renderPaymentLogsPdf(data(rowsOf(1)), branding({ logo_url: 'https://cdn.duncit.test/logo.png' }));
    expect(pages(offline)).toBe(1);
    expect(offline.toString('latin1')).not.toContain('/Subtype /Image');
  });
});

describe('fetchPaymentLogRows', () => {
  const page = (rows: PaymentLogRow[], total: number) => ({ rows, total, page: 1, page_size: 100 });

  it('reads the table a page of 100 at a time, keeping the search, filters and sort', async () => {
    table
      .mockResolvedValueOnce(page(rowsOf(100, 1), 250))
      .mockResolvedValueOnce(page(rowsOf(100, 101), 250))
      .mockResolvedValueOnce(page(rowsOf(50, 201), 250));
    const query = { search: 'asha', sort_by: 'total', sort_dir: 'desc', filters: [{ field: 'status', op: 'eq' as const, value: 'SUCCESS' }] };

    const result = await fetchPaymentLogRows(query, null);

    expect(result.rows).toHaveLength(250);
    expect(result.total).toBe(250);
    expect(table).toHaveBeenCalledTimes(3);
    expect(table.mock.calls.map(([input]) => input.page)).toEqual([1, 2, 3]);
    for (const [input] of table.mock.calls) {
      expect(input).toMatchObject({ search: 'asha', sort_by: 'total', sort_dir: 'desc', page_size: 100, filters: query.filters });
    }
    expect(tableForShop).not.toHaveBeenCalled();
  });

  it('stops at an empty page even when the total promises more', async () => {
    table.mockResolvedValueOnce(page(rowsOf(100), 900)).mockResolvedValueOnce(page([], 900));
    const result = await fetchPaymentLogRows(undefined, undefined);
    expect(result.rows).toHaveLength(100);
    expect(result.total).toBe(900);
    expect(table).toHaveBeenCalledTimes(2);
  });

  it('never prints more than the cap, but still reports how many payments match', async () => {
    table.mockImplementation(async (input: { page: number }) => page(rowsOf(100, (input.page - 1) * 100 + 1), 5000));
    const result = await fetchPaymentLogRows(null, null);
    expect(PAYMENT_LOGS_PDF_MAX_ROWS).toBe(2000);
    expect(result.rows).toHaveLength(2000);
    expect(result.total).toBe(5000);
    expect(table).toHaveBeenCalledTimes(20);
  });

  it("reads one shop's log through that shop's own scoped read, never the all-payments one", async () => {
    tableForShop.mockResolvedValueOnce(page(rowsOf(2), 2));
    const result = await fetchPaymentLogRows({ search: 'x' }, 'POD_SHOP');
    expect(result.rows).toHaveLength(2);
    expect(tableForShop).toHaveBeenCalledWith('POD_SHOP', expect.objectContaining({ search: 'x', page: 1, page_size: 100 }));
    expect(table).not.toHaveBeenCalled();
  });

  it('is empty when nothing matches', async () => {
    table.mockResolvedValueOnce(page([], 0));
    expect(await fetchPaymentLogRows(null, null)).toEqual({ rows: [], total: 0 });
  });
});

describe('paymentLogsPdf', () => {
  it('answers a base64 PDF built from the table rows and the Finance branding', async () => {
    financeSettings.mockResolvedValue({
      business_name: 'Duncit',
      invoice_logo_url: '',
      invoice_support_email: 'help@duncit.test',
      invoice_support_phone: '+91 00000 00000',
    });
    table.mockResolvedValueOnce({ rows: rowsOf(3), total: 3, page: 1, page_size: 100 });

    const base64 = await paymentLogsPdf({ query: { search: 'asha' } });

    const pdf = Buffer.from(base64, 'base64');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pages(pdf)).toBe(1);
    expect(table).toHaveBeenCalledWith(expect.objectContaining({ search: 'asha' }));
  });

  it('fails loudly rather than answering a blank file when the table cannot be read', async () => {
    financeSettings.mockResolvedValue({ business_name: 'Duncit', invoice_logo_url: '', invoice_support_email: '', invoice_support_phone: '' });
    table.mockRejectedValueOnce(new Error('database down'));
    await expect(paymentLogsPdf({})).rejects.toThrow('database down');
  });
});
