import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard, downloadFile, printHtml, safeFileName } from '../../src/lib/docActions';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('safeFileName', () => {
  it('builds a filesystem-safe name', () => {
    expect(safeFileName('Privacy Policy')).toBe('privacy-policy.html');
    expect(safeFileName('Refund & Cancellation', 'txt')).toBe('refund-cancellation.txt');
  });

  it('falls back to "document" for an empty name', () => {
    expect(safeFileName('')).toBe('document.html');
    expect(safeFileName('!!!')).toBe('document.html');
  });
});

describe('downloadFile', () => {
  it('creates an object URL, clicks an anchor and revokes the URL', () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    const revokeObjectURL = vi.fn();
    (URL as any).createObjectURL = createObjectURL;
    (URL as any).revokeObjectURL = revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadFile('doc.html', '<p>Hi</p>');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });
});

describe('printHtml', () => {
  it('writes the html into a popup and prints it', () => {
    const win = { document: { write: vi.fn(), close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
    vi.stubGlobal('open', vi.fn(() => win));
    expect(printHtml('<h1>Doc</h1>')).toBe(true);
    expect(win.document.write).toHaveBeenCalledWith('<h1>Doc</h1>');
    expect(win.print).toHaveBeenCalled();
  });

  it('returns false when the popup is blocked', () => {
    vi.stubGlobal('open', vi.fn(() => null));
    expect(printHtml('<h1>Doc</h1>')).toBe(false);
  });
});

describe('copyToClipboard', () => {
  it('resolves true on success', async () => {
    (navigator as any).clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    expect(await copyToClipboard('hello')).toBe(true);
  });

  it('resolves false on failure', async () => {
    (navigator as any).clipboard = { writeText: vi.fn().mockRejectedValue(new Error('denied')) };
    expect(await copyToClipboard('hello')).toBe(false);
  });
});
