import PDFDocument from 'pdfkit';

export interface ProductInvoiceLine {
  name: string;
  qty: number;
  unit_cost: number;
  gross: number;
  commission_pct: number;
  commission: number;
  net: number;
}

export interface ProductInvoiceData {
  title: string;
  invoice_no: string;
  invoice_date: Date;
  pod_title: string;
  seller_name: string;
  seller_email: string;
  business_name: string;
  business_address: string;
  business_gstin: string;
  currency_symbol: string;
  items: ProductInvoiceLine[];
  gross_total: number;
  commission_total: number;
  net_total: number;
  invoice_logo_url?: string;
  invoice_terms?: string;
  invoice_footer_note?: string;
}

const ACCENT = '#ff4f73';
const ACCENT_SOFT = '#fff1f4';
const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';

async function loadLogo(url?: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Per-seller product invoice for products sold on a completed pod. */
export async function generateProductInvoicePdf(d: ProductInvoiceData): Promise<Buffer> {
  const logo = await loadLogo(d.invoice_logo_url);
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const L = 48;
      const R = W - 48;
      const cur = d.currency_symbol;
      const fmt = (n: number) => `${cur}${(Number(n) || 0).toFixed(2)}`;

      doc.rect(0, 0, W, 96).fill(ACCENT);
      if (logo) {
        try {
          doc.image(logo, L, 26, { fit: [150, 44], valign: 'center' });
        } catch {
          doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text(d.business_name, L, 30);
        }
      } else {
        doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text(d.business_name, L, 30);
      }
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text(d.title, L, 38, { width: R - L, align: 'right' });

      let y = 116;
      doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(d.business_name, L, y);
      doc.fillColor(MUTED).fontSize(9).font('Helvetica');
      if (d.business_address) doc.text(d.business_address, L, doc.y + 2, { width: 260 });
      if (d.business_gstin) doc.text(`GSTIN: ${d.business_gstin}`, L, doc.y + 2);
      doc.fillColor(MUTED).fontSize(9).text('Invoice No', 360, y, { width: R - 360, align: 'right' });
      doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(d.invoice_no, 360, doc.y, { width: R - 360, align: 'right' });
      doc
        .fillColor(MUTED)
        .fontSize(9)
        .font('Helvetica')
        .text(`Date: ${d.invoice_date.toLocaleDateString('en-IN')}`, 360, doc.y + 4, { width: R - 360, align: 'right' })
        .text(`Pod: ${d.pod_title}`, 360, doc.y + 2, { width: R - 360, align: 'right' });

      y = Math.max(doc.y, y + 64) + 14;
      doc.roundedRect(L, y, R - L, 60, 10).fill(ACCENT_SOFT);
      doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold').text('PAYABLE TO · SELLER', L + 14, y + 12);
      doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(d.seller_name, L + 14, y + 24);
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(d.seller_email, L + 14, y + 40, { width: R - L - 28 });

      y += 60 + 22;
      const colX = { name: L + 6, qty: 280, gross: 330, comm: 420, net: 500 };
      doc.rect(L, y - 6, R - L, 24).fill(ACCENT);
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
      doc
        .text('PRODUCT', colX.name, y, { width: 220 })
        .text('QTY', colX.qty, y, { width: 40, align: 'right' })
        .text('GROSS', colX.gross, y, { width: 80, align: 'right' })
        .text('COMMISSION', colX.comm, y, { width: 70, align: 'right' })
        .text('NET', colX.net, y, { width: R - colX.net, align: 'right' });
      y += 26;
      doc.fillColor(INK).fontSize(9.5).font('Helvetica');
      for (const it of d.items) {
        doc
          .text(it.name, colX.name, y, { width: 220 })
          .text(String(it.qty), colX.qty, y, { width: 40, align: 'right' })
          .text(fmt(it.gross), colX.gross, y, { width: 80, align: 'right' })
          .text(`${it.commission_pct}%`, colX.comm, y, { width: 70, align: 'right' })
          .text(fmt(it.net), colX.net, y, { width: R - colX.net, align: 'right' });
        y = doc.y + 8;
        doc.moveTo(L, y - 2).lineTo(R, y - 2).strokeColor(LINE).stroke();
      }

      y += 10;
      const row = (label: string, value: string, bold = false) => {
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(bold ? 12 : 10)
          .fillColor(bold ? INK : MUTED)
          .text(label, 300, y, { width: 150, align: 'right' })
          .fillColor(bold ? ACCENT : INK)
          .text(value, 456, y, { width: R - 456, align: 'right' });
        y += bold ? 22 : 17;
      };
      row('Gross', fmt(d.gross_total));
      row('Duncit commission', fmt(d.commission_total));
      doc.moveTo(300, y).lineTo(R, y).strokeColor('#cbd5e1').stroke();
      y += 8;
      row('Net payable', fmt(d.net_total), true);

      y += 14;
      if (d.invoice_terms) {
        doc.fillColor(INK).fontSize(8.5).font('Helvetica-Bold').text('Terms', L, y);
        doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(d.invoice_terms, L, doc.y + 2, { width: R - L });
      }
      doc
        .fontSize(8)
        .fillColor('#9ca3af')
        .text(
          d.invoice_footer_note || 'This is a computer-generated document and does not require a signature.',
          L,
          doc.y + 14,
          { align: 'center', width: R - L }
        );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
