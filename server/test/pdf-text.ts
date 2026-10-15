import PDFDocument from 'pdfkit';

/** One `doc.text(...)` call, as the generator made it. */
export interface DrawnText {
  text: string;
  x: number;
  y: number;
  width?: number;
}

/** pdfkit's typings describe the instance only; the drawing methods live on the class prototype. */
const pdfPrototype = (PDFDocument as unknown as { prototype: PDFKit.PDFDocument }).prototype;

/**
 * Every string a PDF generator handed to pdfkit while `draw` ran, with where it
 * was placed. The real pdfkit still lays out and renders the document — only
 * the calls are recorded — so heights and wrapping are pdfkit's own.
 */
export async function capturePdfText(draw: () => unknown): Promise<DrawnText[]> {
  const spy = jest.spyOn(pdfPrototype, 'text');
  try {
    await draw();
    return spy.mock.calls.map((call) => {
      const [text, x, y, options] = call as unknown[];
      return {
        text: String(text),
        x: Number(x),
        y: Number(y),
        width: (options as { width?: number } | undefined)?.width,
      };
    });
  } finally {
    spy.mockRestore();
  }
}

/** The one drawn call whose text is exactly `text`; fails loudly if there is not exactly one. */
export function drawnOnce(drawn: readonly DrawnText[], text: string): DrawnText {
  const matches = drawn.filter((entry) => entry.text === text);
  if (matches.length !== 1) {
    throw new Error(`expected "${text}" to be drawn once, found ${matches.length}`);
  }
  return matches[0];
}

/** How tall `text` is in Helvetica at `size`, wrapped at `width` — pdfkit's own measurement. */
export function helveticaHeight(text: string, width: number, size: number): number {
  return new PDFDocument({ size: 'A4', margin: 0 })
    .font('Helvetica')
    .fontSize(size)
    .heightOfString(text, { width });
}
