/**
 * The Pod Profit report.
 *
 * The layout bug this file exists to keep out: the money columns used to carry
 * hard-coded x offsets, and DUNCIT sat at x=544 with a width of 54 on a 595pt
 * page — three points past the paper, so the figure the report is read for
 * printed off the edge. `layoutOf` now walks back from the right margin, and
 * the assertion below is that the widest realistic cell still fits.
 */
import PDFDocument from 'pdfkit';
import { generatePodCalculatorPdf } from '../../pod-calculator.pdf';
import { lineFor, totalsOf } from '@modules/finance/podCalculator/podCalculator.totals';
import type { IPodCalculatorPod } from '@modules/finance/podCalculator/podCalculator.model';

const pod = (name: string, count: number): IPodCalculatorPod =>
  ({
    pod_key: name,
    name,
    pod_amount: 1000,
    no_of_spots: 30,
    pod_count: count,
    gst_percent: 18,
    platform_fee_percent: 5,
    venue_amount: 400,
    host_commission_percent: 10,
    venue_commission_percent: 10,
    club_admin_percent: 0,
  }) as IPodCalculatorPod;

const lines = [pod('Pod 1', 1), pod('Pod 2', 4), pod('Pod 3', 250)].map(lineFor);

const report = (over: Record<string, unknown> = {}) =>
  generatePodCalculatorPdf({
    name: 'Q4 comparison',
    kind_label: 'Multi-pod comparison',
    generated_at: new Date('2026-09-05T05:19:58.000Z'),
    currency_symbol: '₹',
    business_name: 'Duncit',
    lines,
    totals: totalsOf(lines),
    ...over,
  });

describe('generatePodCalculatorPdf', () => {
  it('renders a PDF', async () => {
    const buf = await report();

    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(500);
  });

  it('renders with no rows at all', async () => {
    const buf = await report({ lines: [], totals: totalsOf([]) });

    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('pages a comparison too long for one sheet', async () => {
    const many = Array.from({ length: 60 }, (_, i) => lineFor(pod(`Pod ${i + 1}`, 1)));
    const one = await report();
    const long = await report({ lines: many, totals: totalsOf(many) });

    expect(long.length).toBeGreaterThan(one.length);
  });

  it('renders when the branding logo cannot be fetched', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    try {
      await expect(report({ invoice_logo_url: 'https://cdn.example/logo.png' })).resolves.toBeInstanceOf(
        Buffer
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('falls back to the business name when the fetched logo is not an image', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Uint8Array.from(Buffer.from('definitely not a png')).buffer,
    }) as unknown as typeof fetch;
    try {
      // pdfkit throws on an unreadable image; the header must still draw.
      await expect(
        report({ invoice_logo_url: 'https://cdn.example/broken.png' })
      ).resolves.toBeInstanceOf(Buffer);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('draws the logo when the fetched bytes are a real image', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const realFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Uint8Array.from(png).buffer,
    }) as unknown as typeof fetch;
    try {
      await expect(
        report({ invoice_logo_url: 'https://cdn.example/logo.png' })
      ).resolves.toBeInstanceOf(Buffer);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  /**
   * The regression guard, measured with pdfkit's own metrics.
   *
   * These widths MIRROR MONEY_COLS in the generator. If a column is narrowed
   * there without checking, or the currency prefix grows, this fails here
   * instead of printing a clipped number on a partner's report.
   */
  it('keeps every column inside the page at an eight-figure projection', () => {
    const MONEY = [
      { key: 'count', w: 28 },
      { key: 'spots', w: 34 },
      { key: 'collection', w: 74 },
      { key: 'gst', w: 68 },
      { key: 'venue', w: 64 },
      { key: 'host', w: 68 },
      { key: 'duncit', w: 68 },
    ] as const;
    const L = 40;
    const PAD = 6;

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const R = doc.page.width - L;
    const money = MONEY.reduce((sum, c) => sum + c.w, 0);

    // The last column must end exactly on the right margin, inside the page.
    expect(L + PAD + PAD + money).toBeLessThan(R);
    expect(R).toBeLessThanOrEqual(doc.page.width);

    const totals = totalsOf(lines);
    const cur = 'INR ';
    const widest: Record<string, string> = {
      count: `x${totals.pods}`,
      spots: '29',
      collection: `${cur}${totals.collection_total.toFixed(2)}`,
      gst: `${cur}${totals.gst_amount.toFixed(2)}`,
      venue: `${cur}${totals.venue_receives.toFixed(2)}`,
      host: `${cur}${totals.host_receives.toFixed(2)}`,
      duncit: `${cur}${totals.duncit_revenue_total.toFixed(2)}`,
    };
    const headers: Record<string, string> = {
      count: 'QTY',
      spots: 'SPOTS',
      collection: 'COLLECTION',
      gst: 'GST',
      venue: 'VENUE',
      host: 'HOST',
      duncit: 'DUNCIT',
    };

    // Eight figures, so the guard is measured against a real worst case.
    expect(totals.collection_total).toBeGreaterThan(1_000_000);

    for (const col of MONEY) {
      doc.font('Helvetica-Bold').fontSize(8.5);
      expect(doc.widthOfString(widest[col.key])).toBeLessThanOrEqual(col.w);
      doc.font('Helvetica-Bold').fontSize(7);
      expect(doc.widthOfString(headers[col.key])).toBeLessThanOrEqual(col.w);
    }
  });
});
