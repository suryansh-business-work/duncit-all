import PDFDocument from 'pdfkit';
import { policyHtmlToText } from './policy.pdf';

const ACCENT = '#ff4f73';
const INK = '#111827';
const MUTED = '#6b7280';
const RULE = '#e5e7eb';

export interface ContractSignatory {
  full_name: string;
  designation: string;
  initials: string;
  /** data: URL (drawn or typed) or an http(s) image URL. */
  signature_image: string;
  signed_at?: Date | string | null;
}

/**
 * Turn a `data:image/...;base64,...` signature into bytes pdfkit can place.
 *
 * Only data URLs are embedded. A remote URL would mean this renderer fetching
 * from the network mid-document — a signed contract that fails to render
 * because somebody's CDN is slow is worse than one that prints the name.
 */
function signatureBytes(image: string): Buffer | null {
  const match = /^data:image\/(png|jpe?g);base64,([\s\S]+)$/i.exec(image ?? '');
  if (!match?.[2]) return null;
  try {
    return Buffer.from(match[2], 'base64');
  } catch {
    return null;
  }
}

/**
 * The contract as a printable A4 PDF — the same document either way, with a
 * signature block appended once it has been signed.
 *
 * One renderer for both versions on purpose: "download the unsigned version"
 * and "download the signed version" must be the same contract, or the signature
 * is attached to something nobody reviewed.
 */
export async function generateContractPdf(data: {
  brand: string;
  title: string;
  document_type?: string | null;
  content_html: string;
  updated_at?: string | null;
  signatories?: ContractSignatory[];
}): Promise<Buffer> {
  const body = policyHtmlToText(data.content_html) || 'This contract has no content yet.';
  const signed = (data.signatories ?? []).filter((s) => s.signed_at);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 56 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.rect(0, 0, doc.page.width, 8).fill(ACCENT);
      doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(11).text(data.brand, 56, 34);
      doc.moveDown(0.4);
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(22).text(data.title);
      if (data.document_type) {
        doc.moveDown(0.2);
        doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(data.document_type);
      }
      if (data.updated_at) {
        doc.moveDown(0.1);
        doc
          .fillColor(MUTED)
          .font('Helvetica')
          .fontSize(9)
          .text(`Last updated: ${new Date(data.updated_at).toDateString()}`);
      }

      doc.moveDown(1);
      doc.fillColor(INK).font('Helvetica').fontSize(11).text(body, { align: 'left', lineGap: 4 });

      if (signed.length === 0) {
        doc.end();
        return;
      }

      // The signatures start on their own page so a block can never be split
      // across a page break — half a signature reads as a tampered document.
      doc.addPage();
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(14).text('Signatures');
      doc.moveDown(0.5);

      for (const person of signed) {
        const top = doc.y;
        doc
          .moveTo(56, top)
          .lineTo(doc.page.width - 56, top)
          .strokeColor(RULE)
          .stroke();
        doc.moveDown(0.6);

        const bytes = signatureBytes(person.signature_image);
        if (bytes) {
          try {
            doc.image(bytes, 56, doc.y, { fit: [180, 54] });
          } catch {
            // A corrupt image must not cost the whole contract its signatures.
          }
          doc.y += 60;
        } else {
          doc.fillColor(INK).font('Helvetica-Oblique').fontSize(16).text(person.full_name, 56);
          doc.moveDown(0.4);
        }

        doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(person.full_name, 56);
        doc.fillColor(MUTED).font('Helvetica').fontSize(10);
        doc.text(person.designation || '—');
        doc.text(`Initials: ${person.initials || '—'}`);
        doc.text(
          `Signed on: ${person.signed_at ? new Date(person.signed_at).toDateString() : '—'}`
        );
        doc.moveDown(1);
      }

      doc.end();
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
