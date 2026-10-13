// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadJsPdf, loadLogo, pdfText } from '../../src/widgets/earnings-calculator-pdf-lib';

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(globalThis, 'jspdf');
  document.head.innerHTML = '';
});

const lastScript = () => document.head.querySelector('script') as HTMLScriptElement;

describe('pdfText', () => {
  it('rewrites the rupee sign and typographic glyphs into WinAnsi characters', () => {
    expect(pdfText('₹1,200 − ₹300 – x — y')).toBe('Rs. 1,200 - Rs. 300 - x - y');
    expect(pdfText('‘a’ “b” … •')).toBe('\'a\' "b" ... -');
  });

  it('replaces anything beyond Latin-1 with a space and keeps accented Latin-1', () => {
    expect(pdfText('café 日本')).toBe('café   ');
  });

  it('stringifies non-string values', () => {
    expect(pdfText(42)).toBe('42');
    expect(pdfText(null)).toBe('null');
  });
});

describe('loadJsPdf', () => {
  it('resolves immediately when the library is already on the page', async () => {
    class Ctor {}
    Reflect.set(globalThis, 'jspdf', { jsPDF: Ctor });
    await expect(loadJsPdf()).resolves.toBe(Ctor);
    expect(document.head.querySelector('script')).toBeNull();
  });

  it('injects the pinned script with integrity and resolves once it has loaded', async () => {
    const pending = loadJsPdf();
    const script = lastScript();
    expect(script.src).toContain('cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/');
    expect(script.integrity).toMatch(/^sha512-/);
    expect(script.crossOrigin).toBe('anonymous');
    expect(script.referrerPolicy).toBe('no-referrer');
    class Ctor {}
    Reflect.set(globalThis, 'jspdf', { jsPDF: Ctor });
    script.onload?.(new Event('load'));
    await expect(pending).resolves.toBe(Ctor);
  });

  it('rejects when the script loads but exposes no constructor', async () => {
    const pending = loadJsPdf();
    lastScript().onload?.(new Event('load'));
    await expect(pending).rejects.toThrow('pdf library unavailable');
  });

  it('rejects when jspdf is present without a jsPDF function', async () => {
    Reflect.set(globalThis, 'jspdf', { jsPDF: 'nope' });
    const pending = loadJsPdf();
    // not usable, so it tried to load the script
    lastScript().onload?.(new Event('load'));
    await expect(pending).rejects.toThrow('pdf library unavailable');
  });

  it('rejects when the script fails to load', async () => {
    const pending = loadJsPdf();
    lastScript().onerror?.(new Event('error'));
    await expect(pending).rejects.toThrow('pdf library unavailable');
  });

  it('treats a non-object jspdf global as not loaded', async () => {
    Reflect.set(globalThis, 'jspdf', 'string');
    const pending = loadJsPdf();
    expect(lastScript()).not.toBeNull();
    lastScript().onerror?.(new Event('error'));
    await expect(pending).rejects.toThrow();
  });
});

describe('loadLogo', () => {
  let imageResult: 'load' | 'error';

  beforeEach(() => {
    imageResult = 'load';
    class FakeImage {
      naturalWidth = 200;
      naturalHeight = 50;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => (imageResult === 'load' ? this.onload?.() : this.onerror?.()));
      }
    }
    vi.stubGlobal('Image', FakeImage);
  });

  const stubBlob = (type: string) =>
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ blob: async () => new Blob(['x'], { type }) })
    );

  it('returns a PNG logo with its natural size', async () => {
    stubBlob('image/png');
    const logo = await loadLogo('https://cdn.test/logo.png');
    expect(logo).toMatchObject({ w: 200, h: 50, format: 'PNG' });
    expect(logo?.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('returns a JPEG logo', async () => {
    stubBlob('image/jpeg');
    expect((await loadLogo('https://cdn.test/logo.jpg'))?.format).toBe('JPEG');
  });

  it('skips an SVG mark that jsPDF cannot draw', async () => {
    stubBlob('image/svg+xml');
    expect(await loadLogo('https://cdn.test/logo.svg')).toBeNull();
  });

  it('returns null when the image cannot be decoded', async () => {
    stubBlob('image/png');
    imageResult = 'error';
    expect(await loadLogo('https://cdn.test/broken.png')).toBeNull();
  });

  it('returns null when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('cors')));
    expect(await loadLogo('https://cdn.test/logo.png')).toBeNull();
  });
});
