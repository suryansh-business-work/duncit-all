/**
 * The PDF attached to every analytics mail.
 *
 * Most tests draw onto a recording stand-in for the pdfkit document, so what
 * was written — and where, in which colour, on which page — can be asserted
 * exactly. One test renders through the real pdfkit to prove the bytes are a
 * PDF and that a long report really breaks onto more pages.
 */
jest.mock('@services/pdf/document', () => ({ loadPdfImage: jest.fn(), renderPdf: jest.fn() }));

import { loadPdfImage, renderPdf } from '@services/pdf/document';
import { analyticsReportPdf, type ReportPdfInput } from '../../mail/analyticsMail.pdf';
import type { ReportSection } from '../../mail/analyticsMail.report';

const m = (fn: unknown) => fn as jest.Mock;

interface Drawn {
  text: string;
  x: number;
  y: number;
  color: string;
  font: string;
  size: number;
  page: number;
  opts?: Record<string, unknown>;
}

/** Records every call the report makes; each text call moves `y` down a line. */
class FakeDoc {
  page = { width: 595.28, height: 841.89 };
  y = 0;
  pages = 1;
  drawn: Drawn[] = [];
  images: unknown[][] = [];
  imageError: Error | null = null;
  private color = '';
  private fontName = '';
  private size = 0;
  rect = () => this;
  fill = (color: string) => {
    this.color = color;
    return this;
  };
  fillColor = (color: string) => {
    this.color = color;
    return this;
  };
  fontSize = (size: number) => {
    this.size = size;
    return this;
  };
  font = (name: string) => {
    this.fontName = name;
    return this;
  };
  text = (text: string, x: number, y: number, opts?: Record<string, unknown>) => {
    this.drawn.push({ text, x, y, color: this.color, font: this.fontName, size: this.size, page: this.pages, opts });
    this.y = y + 12;
    return this;
  };
  image = (...args: unknown[]) => {
    if (this.imageError) throw this.imageError;
    this.images.push(args);
    return this;
  };
  addPage = () => {
    this.pages += 1;
    return this;
  };
  moveTo = () => this;
  lineTo = () => this;
  strokeColor = () => this;
  lineWidth = () => this;
  stroke = () => this;

  find(text: string): Drawn | undefined {
    return this.drawn.find((d) => d.text === text);
  }
  has(text: string): boolean {
    return this.drawn.some((d) => d.text === text);
  }
}

let doc: FakeDoc;
const copy = { t: (key: string) => `[${key.replace('email.analyticsReport.', '')}]`, locale: 'en' };

const section = (over: Partial<ReportSection> = {}): ReportSection => ({
  entity: 'PODS',
  title: 'Pods',
  url: 'https://analytics/pods',
  kpis: [],
  table: null,
  error: null,
  ...over,
});

const input = (over: Partial<ReportPdfInput> = {}): ReportPdfInput => ({
  report: {
    title: 'Weekly report',
    period: '1 Mar - 7 Mar 2026',
    generated: '8 Mar 2026, 09:00',
    url: 'https://analytics.duncit.example/reports',
    sections: [],
  },
  copy,
  recipient: 'ops@duncit.com',
  brandName: 'Duncit',
  ...over,
});

beforeEach(() => {
  doc = new FakeDoc();
  m(loadPdfImage).mockReset().mockResolvedValue(null);
  m(renderPdf)
    .mockReset()
    .mockImplementation(async (draw: (d: unknown) => void) => {
      draw(doc);
      return Buffer.from('rendered');
    });
});

describe('analyticsReportPdf — header and meta', () => {
  it('writes the brand name when there is no logo, then the heading, title and period lines', async () => {
    const out = await analyticsReportPdf(input());
    expect(out.toString()).toBe('rendered');
    expect(loadPdfImage).toHaveBeenCalledWith(undefined);
    expect(doc.find('Duncit')).toMatchObject({ x: 40, y: 32, color: '#ffffff', font: 'Helvetica-Bold', size: 20 });
    expect(doc.find('[pdfHeading]')).toMatchObject({ x: 40, y: 36, opts: { width: 515, align: 'right' } });
    expect(doc.find('Weekly report')).toMatchObject({ y: 112, color: '#111827', size: 16 });
    expect(doc.drawn.map((d) => d.text)).toEqual(
      expect.arrayContaining([
        '[periodLabel]: 1 Mar - 7 Mar 2026',
        '[generatedLabel]: 8 Mar 2026, 09:00',
        '[preparedFor]: ops@duncit.com',
      ])
    );
    expect(doc.images).toHaveLength(0);
  });

  it('draws the logo instead of the brand name when it loads', async () => {
    const logo = Buffer.from('png');
    m(loadPdfImage).mockResolvedValue(logo);
    await analyticsReportPdf(input({ logoUrl: 'https://cdn.example/logo.png' }));
    expect(loadPdfImage).toHaveBeenCalledWith('https://cdn.example/logo.png');
    expect(doc.images).toEqual([[logo, 40, 22, { fit: [140, 44], valign: 'center' }]]);
    expect(doc.has('Duncit')).toBe(false);
  });

  it('falls back to the brand name when pdfkit cannot decode the logo', async () => {
    m(loadPdfImage).mockResolvedValue(Buffer.from('not an image'));
    doc.imageError = new Error('Unknown image format');
    await expect(analyticsReportPdf(input({ logoUrl: 'https://cdn.example/x' }))).resolves.toBeInstanceOf(Buffer);
    expect(doc.has('Duncit')).toBe(true);
  });

  it('closes with the note and a link to the live report', async () => {
    await analyticsReportPdf(input());
    expect(doc.has('[pdfClosing]')).toBe(true);
    expect(doc.find('https://analytics.duncit.example/reports')).toMatchObject({
      color: '#b91c1c',
      opts: { width: 515, link: 'https://analytics.duncit.example/reports', underline: true },
    });
  });
});

describe('analyticsReportPdf — AI summary', () => {
  it('leaves the summary out when none was asked for', async () => {
    await analyticsReportPdf(input({ summary: null }));
    expect(doc.has('[aiHeading]')).toBe(false);
    expect(doc.has('[aiNote]')).toBe(false);
  });

  it('draws the headline, every non-empty list and the AI note', async () => {
    await analyticsReportPdf(
      input({
        summary: {
          headline: 'Bookings rose 12%',
          highlights: ['Pune doubled', 'Repeat rate up'],
          concerns: [],
          watch: ['Refunds'],
        },
      })
    );
    const texts = doc.drawn.map((d) => d.text);
    const order = ['[aiHeading]', 'Bookings rose 12%', '[aiHighlights]', '- Pune doubled', '- Repeat rate up', '[aiWatch]', '- Refunds', '[aiNote]'];
    expect(order.map((t) => texts.indexOf(t))).toEqual([...order.map((t) => texts.indexOf(t))].sort((a, b) => a - b));
    expect(order.every((t) => texts.includes(t))).toBe(true);
    // An empty list gets no label at all.
    expect(texts).not.toContain('[aiConcerns]');
    expect(doc.find('[aiHeading]')?.color).toBe('#b91c1c');
  });
});

describe('analyticsReportPdf — sections', () => {
  it('writes a section that could not be read as its error alone', async () => {
    await analyticsReportPdf(
      input({
        report: {
          ...input().report,
          sections: [section({ title: 'SonarQube', error: 'SonarQube is not connected', kpis: [{ title: 'Bugs', value: '3', change: '+1', tone: 'bad' }] })],
        },
      })
    );
    expect(doc.find('SonarQube')).toMatchObject({ color: '#b91c1c', font: 'Helvetica-Bold' });
    expect(doc.find('SonarQube is not connected')).toMatchObject({ color: '#b91c1c', x: 40 });
    expect(doc.has('Bugs')).toBe(false);
  });

  it('lays tiles two to a row, colouring each change by its tone', async () => {
    await analyticsReportPdf(
      input({
        report: {
          ...input().report,
          sections: [
            section({
              kpis: [
                { title: 'Pods held', value: '120', change: '+12%', tone: 'good' },
                { title: 'Cancelled', value: '8', change: '+3', tone: 'bad' },
                { title: 'Hosts', value: '40', change: '0', tone: 'flat' },
                { title: 'Venues', value: '9', change: 'n/a', tone: null },
                { title: 'Cities', value: '3', change: '—', tone: null },
              ],
            }),
          ],
        },
      })
    );
    const left = doc.find('Pods held');
    const right = doc.find('Cancelled');
    expect(left?.x).toBe(48);
    expect(right?.x).toBe(305.5);
    expect(right?.y).toBe(left?.y);
    expect(doc.find('Hosts')?.y).toBe((left?.y ?? 0) + 46);
    // The fifth tile sits alone on the third row.
    expect(doc.find('Cities')).toMatchObject({ x: 48, y: (left?.y ?? 0) + 92 });
    expect(doc.find('+12%')?.color).toBe('#15803d');
    expect(doc.find('+3')?.color).toBe('#b91c1c');
    expect(doc.find('0')?.color).toBe('#4b5563');
    expect(doc.find('n/a')?.color).toBe('#4b5563');
    expect(doc.find('120')).toMatchObject({ color: '#111827', size: 13 });
  });

  it('draws the ranking as a numbered table with right-aligned value columns', async () => {
    await analyticsReportPdf(
      input({
        report: {
          ...input().report,
          sections: [
            section({
              table: {
                title: 'Top clubs',
                columns: ['Pods', 'Members'],
                rows: [
                  { id: 'c1', name: 'Dog Walkers', values: ['12', '300'] },
                  { id: 'c2', name: 'Cat Cafe', values: ['7', '120'] },
                ],
              },
            }),
          ],
        },
      })
    );
    expect(doc.has('Top clubs')).toBe(true);
    expect(doc.find('[nameColumn]')?.color).toBe('#b91c1c');
    expect(doc.find('#')).toMatchObject({ x: 48 });
    expect(doc.find('Dog Walkers')).toMatchObject({ x: 70, opts: { width: 349, ellipsis: true, lineBreak: false } });
    expect(doc.find('1')).toMatchObject({ x: 48, y: (doc.find('Dog Walkers')?.y ?? 0) });
    expect(doc.find('2')?.y).toBe((doc.find('1')?.y ?? 0) + 18);
    expect(doc.find('12')).toMatchObject({ x: 419, opts: { width: 64, align: 'right', ellipsis: true, lineBreak: false } });
    expect(doc.find('300')).toMatchObject({ x: 483 });
  });

  it('skips a ranking with no rows', async () => {
    await analyticsReportPdf(
      input({ report: { ...input().report, sections: [section({ table: { title: 'Top clubs', columns: ['Pods'], rows: [] } })] } })
    );
    expect(doc.has('Top clubs')).toBe(false);
    expect(doc.has('[nameColumn]')).toBe(false);
  });

  it('starts a new page whenever the next row would run into the footer', async () => {
    const rows = Array.from({ length: 80 }, (_v, i) => ({ id: `r${i}`, name: `Club ${i + 1}`, values: [String(i)] }));
    await analyticsReportPdf(
      input({ report: { ...input().report, sections: [section({ table: { title: 'Top clubs', columns: ['Pods'], rows } })] } })
    );
    expect(doc.pages).toBeGreaterThanOrEqual(2);
    const firstOnPage2 = doc.drawn.find((d) => d.page === 2 && d.text.startsWith('Club '));
    // A fresh page starts at the top margin (48), the row text 5pt below it.
    expect(firstOnPage2?.y).toBe(53);
    expect(doc.drawn.filter((d) => d.text.startsWith('Club ')).every((d) => d.y + 18 <= 841.89 - 56 + 5)).toBe(true);
  });
});

describe('analyticsReportPdf — real pdfkit', () => {
  it('produces a PDF, and a long report takes more pages than a short one', async () => {
    const actual = jest.requireActual('@services/pdf/document');
    m(renderPdf).mockImplementation(actual.renderPdf);
    const pageCount = (buf: Buffer) => (buf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

    const short = await analyticsReportPdf(input({ report: { ...input().report, sections: [section({ kpis: [{ title: 'A', value: '1', change: '+1', tone: 'good' }] })] } }));
    expect(short.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(short)).toBe(1);

    const rows = Array.from({ length: 120 }, (_v, i) => ({ id: `r${i}`, name: `Club ${i}`, values: [String(i)] }));
    const long = await analyticsReportPdf(
      input({
        summary: { headline: 'h', highlights: ['a'], concerns: ['b'], watch: ['c'] },
        report: { ...input().report, sections: [section({ table: { title: 'Top', columns: ['Pods'], rows } })] },
      })
    );
    expect(pageCount(long)).toBeGreaterThan(1);
  });
});
