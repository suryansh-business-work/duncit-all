/**
 * What the earnings estimate PDF is drawn WITH: jsPDF (loaded on the first
 * click, so a visitor who never asks for a PDF never downloads it), the logo,
 * and the text sanitiser jsPDF's built-in fonts need.
 */

/** The slice of jsPDF's document API the estimate uses. */
export interface PdfDoc {
  setFont(name: string, style: string): PdfDoc;
  setFontSize(size: number): PdfDoc;
  setTextColor(r: number, g: number, b: number): PdfDoc;
  setDrawColor(r: number, g: number, b: number): PdfDoc;
  setFillColor(r: number, g: number, b: number): PdfDoc;
  setLineWidth(width: number): PdfDoc;
  setProperties(properties: { title: string; author: string }): PdfDoc;
  text(text: string | string[], x: number, y: number, options?: { align: 'right' }): PdfDoc;
  line(x1: number, y1: number, x2: number, y2: number): PdfDoc;
  circle(x: number, y: number, radius: number, style: string): PdfDoc;
  roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style: string): PdfDoc;
  addImage(data: string, format: string, x: number, y: number, w: number, h: number): PdfDoc;
  addPage(): PdfDoc;
  splitTextToSize(text: string, width: number): string[];
  save(fileName: string): void;
}

export type JsPdfCtor = new (options: { unit: 'mm'; format: 'a4' }) => PdfDoc;

export interface PdfLogo {
  dataUrl: string;
  w: number;
  h: number;
  format: 'PNG' | 'JPEG';
}

const JSPDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js';
const JSPDF_SRI = 'sha512-plOdviVmws4Y3JAvbnpfKb2hVxKM1lCwsi3vmElYRj+tiDLffZ4FVUj5a8vyKJ9pIgl8JCAHEJ4D1iUKBecswg==';

/** The UMD build's constructor, once it is on the page. */
function loadedJsPdf(): JsPdfCtor | null {
  const lib: unknown = Reflect.get(globalThis, 'jspdf');
  if (typeof lib !== 'object' || lib === null) return null;
  const ctor = Reflect.get(lib, 'jsPDF');
  return typeof ctor === 'function' ? ctor : null;
}

export function loadJsPdf(): Promise<JsPdfCtor> {
  return new Promise((resolve, reject) => {
    const ready = loadedJsPdf();
    if (ready) {
      resolve(ready);
      return;
    }
    const script = document.createElement('script');
    script.src = JSPDF_SRC;
    script.integrity = JSPDF_SRI;
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';
    script.onload = () => {
      const ctor = loadedJsPdf();
      if (ctor) resolve(ctor);
      else reject(new Error('pdf library unavailable'));
    };
    script.onerror = () => reject(new Error('pdf library unavailable'));
    document.head.appendChild(script);
  });
}

const readDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });

const imageSize = (src: string): Promise<{ w: number; h: number } | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** The logo as a data URL. jsPDF draws JPEG and PNG only, so an SVG mark is
 * skipped and the page keeps its wordmark instead of failing to save. */
export async function loadLogo(src: string): Promise<PdfLogo | null> {
  try {
    const res = await fetch(src, { mode: 'cors' });
    const blob = await res.blob();
    if (!['image/jpeg', 'image/png'].includes(blob.type)) return null;
    const dataUrl = await readDataUrl(blob);
    const size = await imageSize(dataUrl);
    return size ? { dataUrl, ...size, format: blob.type === 'image/png' ? 'PNG' : 'JPEG' } : null;
  } catch {
    return null;
  }
}

// jsPDF's built-in fonts are WinAnsi. A character outside it — the rupee
// sign, a true minus, a curly apostrophe — makes jsPDF fall back to a
// two-byte encoding for the WHOLE string, which printed as `" R s .  6 , 6 9 8`.
// So every string is rewritten into characters the font actually has.
const PDF_GLYPHS: Readonly<Record<string, string>> = {
  '−': '-', // minus
  '–': '-', // en dash
  '—': '-', // em dash
  '‘': "'", // curly quotes
  '’': "'",
  '“': '"',
  '”': '"',
  '…': '...', // ellipsis
  '•': '-', // bullet
  '₹': 'Rs. ', // rupee
};

export const pdfText = (value: unknown): string =>
  String(value)
    .replaceAll(/[−–—‘’“”…•₹]/g, (glyph) => PDF_GLYPHS[glyph] ?? glyph)
    // Anything still beyond Latin-1 would trigger that same fallback.
    .replaceAll(/[^ -ÿ]/g, ' ');
