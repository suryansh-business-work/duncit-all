import PDFDocument from 'pdfkit';

export interface InvoiceLineItem {
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
}

export interface InvoiceData {
  invoice_no: string;
  invoice_date: Date;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  business_name: string;
  business_address: string;
  business_gstin: string;
  currency_symbol: string;
  items: InvoiceLineItem[];
  subtotal: number;
  platform_fee_amount: number;
  platform_fee_pct: number;
  gst_amount: number;
  gst_pct: number;
  total: number;
  payment_id: string;
  payment_method: string;
  // Dynamic branding pulled from Finance → Invoice Management. All optional so
  // older callers keep working; the generator renders only what is provided.
  invoice_label?: string;
  invoice_support_email?: string;
  invoice_support_phone?: string;
  invoice_footer_note?: string;
  invoice_terms?: string;
  invoice_logo_url?: string;
}

// Duncit brand palette — kept in lock-step with the ticket PDF + app theme.
const ACCENT = '#ff4f73';
const ACCENT_SOFT = '#fff1f4';
const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';

/** Best-effort fetch of a remote logo into a Buffer pdfkit can embed. Returns
 * null when no URL is set or the fetch/format fails — the wordmark is used then. */
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

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const logo = await loadLogo(data.invoice_logo_url);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const L = 48; // left margin
      const R = W - 48; // right edge
      const cur = data.currency_symbol;
      const fmt = (n: number) => `${cur}${n.toFixed(2)}`;

      // ---- Brand header band ----
      doc.rect(0, 0, W, 96).fill(ACCENT);
      if (logo) {
        try {
          doc.image(logo, L, 26, { fit: [150, 44], valign: 'center' });
        } catch {
          doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text(data.business_name, L, 30);
        }
      } else {
        doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text(data.business_name, L, 30);
      }
      doc
        .fillColor('#ffffff')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(data.invoice_label || 'TAX INVOICE', L, 36, { width: R - L, align: 'right' });

      // ---- Business + invoice meta row ----
      let y = 116;
      doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(data.business_name, L, y);
      doc.fillColor(MUTED).fontSize(9).font('Helvetica');
      if (data.business_address) doc.text(data.business_address, L, doc.y + 2, { width: 260 });
      if (data.business_gstin) doc.text(`GSTIN: ${data.business_gstin}`, L, doc.y + 2);

      doc
        .fillColor(MUTED)
        .fontSize(9)
        .font('Helvetica')
        .text(`Invoice No`, 360, y, { width: R - 360, align: 'right' });
      doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(data.invoice_no, 360, doc.y, { width: R - 360, align: 'right' });
      doc
        .fillColor(MUTED)
        .fontSize(9)
        .font('Helvetica')
        .text(`Date: ${data.invoice_date.toLocaleDateString('en-IN')}`, 360, doc.y + 4, { width: R - 360, align: 'right' })
        .text(`Payment ID: ${data.payment_id}`, 360, doc.y + 2, { width: R - 360, align: 'right' });

      // ---- Bill To card ----
      y = Math.max(doc.y, y + 64) + 14;
      doc.roundedRect(L, y, R - L, 60, 10).fill(ACCENT_SOFT);
      doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold').text('BILL TO', L + 14, y + 12);
      doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(data.customer_name, L + 14, y + 24);
      doc.fillColor(MUTED).fontSize(9).font('Helvetica');
      const contact = [data.customer_email, data.customer_phone].filter(Boolean).join('  ·  ');
      doc.text(contact, L + 14, y + 40, { width: R - L - 28 });

      // ---- Items table ----
      y += 60 + 22;
      const colX = { desc: L + 6, qty: 320, price: 386, amount: 476 };
      doc.rect(L, y - 6, R - L, 24).fill(ACCENT);
      doc.fillColor('#ffffff').fontSize(9.5).font('Helvetica-Bold');
      doc
        .text('DESCRIPTION', colX.desc, y, { width: 250 })
        .text('QTY', colX.qty, y, { width: 50, align: 'right' })
        .text('PRICE', colX.price, y, { width: 80, align: 'right' })
        .text('AMOUNT', colX.amount, y, { width: R - colX.amount, align: 'right' });

      y += 26;
      doc.fillColor(INK).fontSize(10).font('Helvetica');
      for (const it of data.items) {
        doc
          .text(it.description, colX.desc, y, { width: 250 })
          .text(String(it.qty), colX.qty, y, { width: 50, align: 'right' })
          .text(fmt(it.unit_price), colX.price, y, { width: 80, align: 'right' })
          .text(fmt(it.amount), colX.amount, y, { width: R - colX.amount, align: 'right' });
        y = doc.y + 8;
        doc.moveTo(L, y - 2).lineTo(R, y - 2).strokeColor(LINE).stroke();
      }

      // ---- Totals ----
      y += 10;
      const totalsRow = (label: string, value: string, bold = false) => {
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(bold ? 12 : 10)
          .fillColor(bold ? INK : MUTED)
          .text(label, 300, y, { width: 150, align: 'right' })
          .fillColor(bold ? ACCENT : INK)
          .text(value, 456, y, { width: R - 456, align: 'right' });
        y += bold ? 22 : 17;
      };
      totalsRow('Subtotal', fmt(data.subtotal));
      totalsRow(`Platform Fee (${data.platform_fee_pct}%)`, fmt(data.platform_fee_amount));
      totalsRow(`GST (${data.gst_pct}%)`, fmt(data.gst_amount));
      doc.moveTo(300, y).lineTo(R, y).strokeColor('#cbd5e1').stroke();
      y += 8;
      totalsRow('Total Paid', fmt(data.total), true);

      // ---- Footer ----
      y += 18;
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(`Payment method: ${data.payment_method}`, L, y);
      const support = [
        data.invoice_support_email ? `Email: ${data.invoice_support_email}` : '',
        data.invoice_support_phone ? `Phone: ${data.invoice_support_phone}` : '',
      ]
        .filter(Boolean)
        .join('   ·   ');
      if (support) doc.fillColor(MUTED).fontSize(9).text(support, L, doc.y + 4);
      if (data.invoice_terms) {
        doc.fillColor(INK).fontSize(8.5).font('Helvetica-Bold').text('Terms', L, doc.y + 12);
        doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(data.invoice_terms, L, doc.y + 2, { width: R - L });
      }
      doc
        .fontSize(8)
        .fillColor('#9ca3af')
        .text(
          data.invoice_footer_note || 'This is a computer-generated invoice and does not require a signature.',
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
