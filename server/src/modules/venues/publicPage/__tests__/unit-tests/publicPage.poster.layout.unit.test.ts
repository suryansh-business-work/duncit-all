/**
 * The poster's arithmetic — the parts that decide what gets printed and can be
 * wrong without anything throwing: which size a name is set at, how the link
 * is shown, which letter stands in for a missing photo, and which modules of
 * the QR are inked.
 */
import QRCode from 'qrcode';
import {
  POSTER,
  QR_QUIET_MODULES,
  displayUrl,
  fitFontSize,
  monogram,
  qrRuns,
} from '../../publicPage.poster.layout';

describe('fitFontSize', () => {
  it('keeps the largest size when it already fits', () => {
    const fits = jest.fn().mockReturnValue(true);

    expect(fitFontSize(54, 26, fits)).toBe(54);
    expect(fits).toHaveBeenCalledTimes(1);
  });

  it('steps down to the first size that fits', () => {
    expect(fitFontSize(54, 26, (size) => size <= 40)).toBe(40);
  });

  it('honours a fractional step', () => {
    expect(fitFontSize(12.5, 8, (size) => size <= 11.2, 0.5)).toBe(11);
  });

  it('falls back to the minimum without measuring it when nothing fits', () => {
    const fits = jest.fn().mockReturnValue(false);

    expect(fitFontSize(30, 17, fits)).toBe(17);
    expect(fits).not.toHaveBeenCalledWith(17);
  });
});

describe('displayUrl', () => {
  it('drops the scheme and a trailing slash', () => {
    expect(displayUrl('https://duncit.com/s/dK3fQ9')).toBe('duncit.com/s/dK3fQ9');
    expect(displayUrl('http://duncit.com/s/abc/')).toBe('duncit.com/s/abc');
    expect(displayUrl('  HTTPS://Duncit.com/s/Ab  ')).toBe('Duncit.com/s/Ab');
  });

  it('leaves an address without a scheme alone', () => {
    expect(displayUrl('duncit.com/s/abc')).toBe('duncit.com/s/abc');
  });
});

describe('monogram', () => {
  it('is the first letter of the name, upper-cased', () => {
    expect(monogram('dek cafe')).toBe('D');
    expect(monogram('  Aarav Mehta')).toBe('A');
  });

  it('skips leading punctuation and accepts a digit', () => {
    expect(monogram('"The" Loft')).toBe('T');
    expect(monogram('#42 Social')).toBe('4');
  });

  it('is empty when the name has no letter or digit to show', () => {
    expect(monogram('')).toBe('');
    expect(monogram(' -- ')).toBe('');
  });
});

describe('qrRuns', () => {
  it('merges neighbouring dark modules in a row and never across rows', () => {
    // 1 1 0
    // 0 0 1
    // 1 0 1
    const data = [1, 1, 0, 0, 0, 1, 1, 0, 1];

    expect(qrRuns(3, data)).toEqual([
      { row: 0, col: 0, length: 2 },
      { row: 1, col: 2, length: 1 },
      { row: 2, col: 0, length: 1 },
      { row: 2, col: 2, length: 1 },
    ]);
  });

  it('returns nothing for an empty matrix', () => {
    expect(qrRuns(2, [0, 0, 0, 0])).toEqual([]);
  });

  it('covers exactly the dark modules of a real symbol', () => {
    const { size, data } = QRCode.create('https://duncit.com/s/dK3fQ9', {
      errorCorrectionLevel: 'Q',
    }).modules;
    const painted = new Uint8Array(size * size);
    for (const run of qrRuns(size, data)) {
      for (let col = run.col; col < run.col + run.length; col += 1) {
        painted[run.row * size + col] += 1;
      }
    }

    expect(Array.from(painted)).toEqual(Array.from(data, (bit) => (bit ? 1 : 0)));
  });
});

describe('the printed code', () => {
  it('is about 60 mm across for a short Duncit link, inside its quiet zone', () => {
    const { size } = QRCode.create('https://duncit.com/s/dK3fQ9', {
      errorCorrectionLevel: 'Q',
    }).modules;
    const symbolMm = ((POSTER.panel.card * size) / (size + QR_QUIET_MODULES * 2)) / 2.835;

    expect(symbolMm).toBeGreaterThanOrEqual(58);
    expect(QR_QUIET_MODULES).toBeGreaterThanOrEqual(4);
  });

  it('keeps the panel and the footer inside a 10 mm print margin', () => {
    const safe = 10 * 2.835;

    expect(POSTER.margin).toBeGreaterThanOrEqual(safe);
    expect(POSTER.footer.top + POSTER.footer.height).toBeLessThanOrEqual(841.89 - safe);
    expect(POSTER.panel.top + POSTER.panel.height).toBeLessThan(POSTER.footer.top);
  });
});
