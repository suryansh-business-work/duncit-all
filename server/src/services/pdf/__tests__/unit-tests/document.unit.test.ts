/**
 * The shared PDF plumbing.
 *
 * Three things every generator depends on and none of them can check for
 * itself: that a throw inside the drawing code REJECTS instead of leaving the
 * request hanging on a promise that never settles, that a missing logo is never
 * the reason a document fails, and that a currency the built-in fonts cannot
 * draw is swapped rather than printed as a stray mark.
 */
import { loadPdfImage, pdfCurrency, renderPdf } from '../../document';

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
