/**
 * The shared PDF plumbing.
 *
 * Three things every generator depends on and none of them can check for
 * itself: that a throw inside the drawing code REJECTS instead of leaving the
 * request hanging on a promise that never settles, that a missing logo is never
 * the reason a document fails, and that a currency the built-in fonts cannot
 * draw is swapped rather than printed as a stray mark.
 */
import PDFDocument from 'pdfkit';
import {
  drawPdfFooters,
  loadPdfImage,
  pdfCurrency,
  pdfCurrencyNote,
  pdfRowHeight,
  pdfSafeText,
  renderPdf,
} from '../../document';

describe('renderPdf', () => {
  it('resolves the drawn document as a PDF buffer', async () => {
    const buf = await renderPdf((doc) => {
      doc.fontSize(12).text('hello');
    });

    expect(Buffer.isBuffer(buf)).toBe(true);
    // Every PDF starts with the version header.
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(100);
  });

  it('calls doc.end() itself, so a generator cannot forget it', async () => {
    // Nothing drawn and no end() called by the caller: it still settles.
    await expect(renderPdf(() => undefined)).resolves.toBeInstanceOf(Buffer);
  });

  it('rejects when the drawing code throws, rather than hanging for ever', async () => {
    const boom = new Error('bad layout');

    await expect(
      renderPdf(() => {
        throw boom;
      })
    ).rejects.toThrow('bad layout');
  });
});

describe('pdfCurrency', () => {
  it('swaps symbols the built-in WinAnsi fonts cannot draw', () => {
    expect(pdfCurrency('₹')).toBe('INR ');
    expect(pdfCurrency('₽')).toBe('RUB ');
  });

  it('passes through the symbols those fonts can draw', () => {
    for (const symbol of ['$', '£', '¥', '€']) {
      expect(pdfCurrency(symbol)).toBe(symbol);
    }
  });

  it('leaves an unknown symbol alone rather than blanking the amount', () => {
    expect(pdfCurrency('Rs.')).toBe('Rs.');
    expect(pdfCurrency('')).toBe('');
  });
});

describe('pdfSafeText', () => {
  it('swaps every unprintable currency symbol inside text formatted elsewhere', () => {
    expect(pdfSafeText('Revenue ₹1,200 · refunds ₹50')).toBe('Revenue INR 1,200 · refunds INR 50');
    expect(pdfSafeText('₽10 and ₩20')).toBe('RUB 10 and KRW 20');
  });

  it('leaves drawable symbols and plain text untouched', () => {
    expect(pdfSafeText('$5 · £4 · €3 · ¥2')).toBe('$5 · £4 · €3 · ¥2');
    expect(pdfSafeText('No money here')).toBe('No money here');
    expect(pdfSafeText('')).toBe('');
  });
});

describe('pdfCurrencyNote', () => {
  it('names the rupee in words, from the symbol or the code', () => {
    expect(pdfCurrencyNote('₹')).toBe('All amounts are in Indian Rupees (INR).');
    expect(pdfCurrencyNote('INR')).toBe('All amounts are in Indian Rupees (INR).');
    expect(pdfCurrencyNote(' ₹ ')).toBe('All amounts are in Indian Rupees (INR).');
  });

  it('prints no line for a currency it cannot name, rather than guessing', () => {
    expect(pdfCurrencyNote('$')).toBeNull();
    expect(pdfCurrencyNote('₽')).toBeNull();
    expect(pdfCurrencyNote('')).toBeNull();
  });
});

describe('pdfRowHeight', () => {
  const doc = () => new PDFDocument({ size: 'A4', margin: 0 }).font('Helvetica').fontSize(10);

  it('is the height of one line for single-line cells', () => {
    const d = doc();
    const line = d.heightOfString('Qty', { width: 200 });

    expect(pdfRowHeight(d, [{ text: 'Qty', width: 200 }, { text: '2', width: 40 }])).toBe(line);
  });

  it('grows to the tallest cell when a description wraps', () => {
    const d = doc();
    const long = 'Pod booking for the long-form Sunday sunset board games meetup at the riverside cafe';
    const single = d.heightOfString('x', { width: 120 });

    const height = pdfRowHeight(d, [
      { text: long, width: 120 },
      { text: 'INR 1000.00', width: 80 },
    ]);

    expect(height).toBe(d.heightOfString(long, { width: 120 }));
    expect(height).toBeGreaterThan(single * 2);
  });

  it('is zero for a row with no cells', () => {
    expect(pdfRowHeight(doc(), [])).toBe(0);
  });
});

describe('loadPdfImage', () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns null when no URL is configured', async () => {
    await expect(loadPdfImage(undefined)).resolves.toBeNull();
    await expect(loadPdfImage('')).resolves.toBeNull();
  });

  it('returns the bytes when the image is served', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }) as unknown as typeof fetch;

    await expect(loadPdfImage('https://cdn.example/logo.png')).resolves.toEqual(
      Buffer.from([1, 2, 3])
    );
  });

  it('returns null on a 404 rather than failing the whole document', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    await expect(loadPdfImage('https://cdn.example/gone.png')).resolves.toBeNull();
  });

  it('returns null when the fetch itself throws', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('DNS')) as unknown as typeof fetch;

    await expect(loadPdfImage('https://nowhere.invalid/logo.png')).resolves.toBeNull();
  });
});

describe('drawPdfFooters', () => {
  const stubDoc = (range: { start: number; count: number }) => {
    const doc = {
      page: { height: 842 },
      bufferedPageRange: jest.fn(() => range),
      switchToPage: jest.fn(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      strokeColor: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
    };
    return doc;
  };
  const options = { left: 36, right: 559, zone: 44, note: 'Generated by Duncit' };

  it('writes the rule, the note, the contacts and "Page x of y" on every buffered page, in order', () => {
    const doc = stubDoc({ start: 2, count: 3 });
    drawPdfFooters(doc as unknown as PDFKit.PDFDocument, { ...options, support: 'help@duncit.test' });

    expect(doc.switchToPage.mock.calls).toEqual([[2], [3], [4]]);
    // The footer sits `zone` up from the bottom edge: 842 - 44 + 14, the rule 8 above it.
    expect(doc.moveTo).toHaveBeenCalledTimes(3);
    expect(doc.moveTo).toHaveBeenCalledWith(36, 804);
    expect(doc.lineTo).toHaveBeenCalledWith(559, 804);
    const textWidth = { width: 433, lineBreak: false };
    expect(doc.text).toHaveBeenCalledTimes(9);
    expect(doc.text).toHaveBeenNthCalledWith(1, 'Generated by Duncit', 36, 812, textWidth);
    expect(doc.text).toHaveBeenNthCalledWith(2, 'help@duncit.test', 36, 824, textWidth);
    expect(doc.text).toHaveBeenNthCalledWith(3, 'Page 1 of 3', 469, 812, { width: 90, align: 'right', lineBreak: false });
    expect(doc.text).toHaveBeenNthCalledWith(6, 'Page 2 of 3', 469, 812, { width: 90, align: 'right', lineBreak: false });
    expect(doc.text).toHaveBeenNthCalledWith(9, 'Page 3 of 3', 469, 812, { width: 90, align: 'right', lineBreak: false });
  });

  it('prints no contact line when there are no contacts', () => {
    const doc = stubDoc({ start: 0, count: 2 });
    drawPdfFooters(doc as unknown as PDFKit.PDFDocument, { ...options, support: '' });
    drawPdfFooters(doc as unknown as PDFKit.PDFDocument, options);

    const printed = doc.text.mock.calls.map((call) => call[0]);
    expect(printed).toEqual([
      'Generated by Duncit', 'Page 1 of 2', 'Generated by Duncit', 'Page 2 of 2',
      'Generated by Duncit', 'Page 1 of 2', 'Generated by Duncit', 'Page 2 of 2',
    ]);
  });

  it('draws nothing on a document that has no buffered pages', () => {
    const doc = stubDoc({ start: 0, count: 0 });
    drawPdfFooters(doc as unknown as PDFKit.PDFDocument, options);

    expect(doc.switchToPage).not.toHaveBeenCalled();
    expect(doc.text).not.toHaveBeenCalled();
  });

  it('works on a real pdfkit document that was opened with bufferPages', async () => {
    const buf = await renderPdf(
      (doc) => {
        doc.text('first page');
        doc.addPage();
        doc.text('second page');
        drawPdfFooters(doc, { ...options, support: 'help@duncit.test' });
      },
      { bufferPages: true }
    );

    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(/\/Type \/Pages[\s\S]*?\/Count (\d+)/.exec(buf.toString('latin1'))?.[1]).toBe('2');
  });
});
