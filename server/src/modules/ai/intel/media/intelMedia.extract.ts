import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';

/**
 * Text out of an uploaded file, page by page where pages exist:
 *  - PDF: each page's text layer (pdf-parse), so answers can cite "page 4";
 *  - images: OCR + a short description through an OpenAI vision model;
 *  - text, Markdown, CSV: read as UTF-8.
 * A scanned PDF with no text layer comes back empty — reported, never faked.
 */

export interface ExtractedText {
  pages: Array<{ page: number; text: string }>;
  method: 'PDF' | 'OCR' | 'TEXT' | 'NONE';
  warning: string;
}

export interface ExtractOptions {
  ocr: boolean;
  visionModel?: string;
  userId?: string;
  credentials?: { apiKey: string; base: string } | null;
}

const TEXT_TYPES = /^text\/(plain|markdown|csv|x-markdown)$/;
const IMAGE_TYPES = /^image\/(png|jpe?g|webp)$/;

interface PdfPage {
  getTextContent: (opts: { normalizeWhitespace: boolean }) => Promise<{ items: Array<{ str: string; transform: number[] }> }>;
}
type PdfParse = (data: Buffer, opts: { pagerender: (page: PdfPage) => Promise<string> }) => Promise<{ numpages: number }>;

async function pdfPages(buffer: Buffer): Promise<Array<{ page: number; text: string }>> {
  // The library entry, not the package root: the root runs a debug harness when required directly.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const parse = require('pdf-parse/lib/pdf-parse.js') as PdfParse;
  const pages: Array<{ page: number; text: string }> = [];
  await parse(buffer, {
    pagerender: async (page) => {
      const content = await page.getTextContent({ normalizeWhitespace: true });
      let lastY: number | null = null;
      let text = '';
      for (const item of content.items) {
        const y = item.transform[5] ?? 0;
        text += lastY === null || y === lastY ? item.str : `\n${item.str}`;
        lastY = y;
      }
      pages.push({ page: pages.length + 1, text });
      return text;
    },
  });
  return pages;
}

async function ocrImage(buffer: Buffer, mime: string, opts: ExtractOptions): Promise<string> {
  const res = await openaiChat({
    task: 'intel.ocr',
    model: opts.visionModel || 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 2000,
    user_id: opts.userId,
    detail: 'uploaded image',
    credentials: opts.credentials,
    messages: [
      { role: 'system', content: (await resolvePrompt('intel.ocr')).content },
      { role: 'user', content: [{ type: 'image_url', image_url: { url: `data:${mime};base64,${buffer.toString('base64')}`, detail: 'high' } }] },
    ],
  });
  if (!res.ok) throw new Error(res.message);
  return res.content;
}

export async function extractDocumentText(buffer: Buffer, mime: string, opts: ExtractOptions): Promise<ExtractedText> {
  if (mime === 'application/pdf') {
    const pages = (await pdfPages(buffer)).filter((p) => p.text.trim());
    return { pages, method: 'PDF', warning: pages.length ? '' : 'This PDF has no text layer (a scan?), so nothing could be indexed.' };
  }
  if (TEXT_TYPES.test(mime)) return { pages: [{ page: 1, text: buffer.toString('utf8') }], method: 'TEXT', warning: '' };
  if (IMAGE_TYPES.test(mime)) {
    if (!opts.ocr) return { pages: [], method: 'NONE', warning: 'Image text extraction is switched off in Settings › Media & Uploads.' };
    return { pages: [{ page: 1, text: await ocrImage(buffer, mime, opts) }], method: 'OCR', warning: '' };
  }
  return { pages: [], method: 'NONE', warning: `Files of type ${mime} are stored but not indexed.` };
}

/** The type a file really is, from its first bytes — never trusted from the browser alone. */
export function sniffMime(buffer: Buffer, declared: string): string | null {
  const head = buffer.subarray(0, 12);
  if (head.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (head[0] === 0x89 && head.subarray(1, 4).toString('latin1') === 'PNG') return 'image/png';
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (TEXT_TYPES.test(declared) && !buffer.subarray(0, 8000).includes(0)) return declared;
  return null;
}
