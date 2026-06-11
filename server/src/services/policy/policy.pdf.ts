import PDFDocument from 'pdfkit';

const ACCENT = '#ff4f73';
const INK = '#111827';
const MUTED = '#6b7280';

/** Collapse the stored policy HTML into printable plain text (paragraph-aware). */
export function policyHtmlToText(html: string): string {
  return (html || '')
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Renders a policy as a branded, paginated A4 PDF (title header + body text). */
export async function generatePolicyPdf(data: {
  brand: string;
  title: string;
  content_html: string;
  updated_at?: string | null;
}): Promise<Buffer> {
  const body = policyHtmlToText(data.content_html) || 'No content published yet.';

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 56 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Brand band
      doc.rect(0, 0, doc.page.width, 8).fill(ACCENT);
      doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(11).text(data.brand, 56, 34);
      doc.moveDown(0.4);
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(22).text(data.title);
      if (data.updated_at) {
        doc.moveDown(0.2);
        doc
          .fillColor(MUTED)
          .font('Helvetica')
          .fontSize(9)
          .text(`Last updated: ${new Date(data.updated_at).toDateString()}`);
      }
      doc.moveDown(1);
      doc.fillColor(INK).font('Helvetica').fontSize(11).text(body, {
        align: 'left',
        lineGap: 4,
      });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
