import PDFDocument from 'pdfkit';

export type PayoutStatementType = 'HOST' | 'VENUE';

export interface PayoutStatementData {
  statement_type: PayoutStatementType;
  release_id: string;
  statement_date: Date;
  pod_title: string;
  beneficiary_name: string;
  beneficiary_email: string;
  business_name: string;
  business_address: string;
  business_gstin: string;
  currency_symbol: string;
  collected_total: number;
  venue_bill: number;
  gst_pct: number;
  gst_amount: number;
  duncit_pct: number;
  duncit_amount: number;
  payout_pct: number;
  payout_amount: number;
  // Branding (shared with the invoice generator). All optional.
  invoice_logo_url?: string;
  invoice_support_email?: string;
  invoice_support_phone?: string;
  invoice_footer_note?: string;
  // Per-party invoice template overrides (Finance → Invoices). All optional.
  title?: string;
  invoice_terms?: string;
}

// Duncit brand palette — kept in lock-step with the invoice + ticket PDFs.
const ACCENT = '#ff4f73';
const ACCENT_SOFT = '#fff1f4';
const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';

interface PayoutRow {
  label: string;
  value: number;
  sign: '+' | '-' | '=';
}

/** The reconciled lines for a host statement; venue uses a leaner waterfall. */
function buildRows(d: PayoutStatementData): PayoutRow[] {
  if (d.statement_type === 'HOST') {
    return [
      { label: 'Total collected', value: d.collected_total, sign: '+' },
      { label: 'Venue bill', value: d.venue_bill, sign: '-' },
      { label: `GST (${d.gst_pct}%)`, value: d.gst_amount, sign: '-' },
      { label: `Duncit Taken (${d.duncit_pct}%)`, value: d.duncit_amount, sign: '-' },
      { label: `Your Commission (${d.payout_pct}%)`, value: d.payout_amount, sign: '=' },
    ];
  }
  return [
    { label: 'Venue bill', value: d.venue_bill, sign: '+' },
    { label: `GST (${d.gst_pct}%)`, value: d.gst_amount, sign: '-' },
    { label: `Duncit Cut (${d.duncit_pct}%)`, value: d.duncit_amount, sign: '-' },
    { label: `Your Payout (${d.payout_pct}%)`, value: d.payout_amount, sign: '=' },
  ];
}

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

function drawHeader(doc: PDFKit.PDFDocument, d: PayoutStatementData, logo: Buffer | null, title: string) {
  const W = doc.page.width;
  const L = 48;
  const R = W - 48;
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
  doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text(title, L, 38, { width: R - L, align: 'right' });
}

export async function generatePayoutPdf(d: PayoutStatementData): Promise<Buffer> {
  const logo = await loadLogo(d.invoice_logo_url);
  const title = d.title || (d.statement_type === 'HOST' ? 'HOST PAYOUT' : 'VENUE PAYOUT');
  const beneficiaryLabel = d.statement_type === 'HOST' ? 'HOST' : 'VENUE OWNER';

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
      const fmt = (n: number) => `${cur}${n.toFixed(2)}`;

      drawHeader(doc, d, logo, title);

      // Business + statement meta
      let y = 116;
      doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(d.business_name, L, y);
      doc.fillColor(MUTED).fontSize(9).font('Helvetica');
      if (d.business_address) doc.text(d.business_address, L, doc.y + 2, { width: 260 });
      if (d.business_gstin) doc.text(`GSTIN: ${d.business_gstin}`, L, doc.y + 2);
      doc.fillColor(MUTED).fontSize(9).text('Statement No', 360, y, { width: R - 360, align: 'right' });
      doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(d.release_id, 360, doc.y, { width: R - 360, align: 'right' });
      doc
        .fillColor(MUTED)
        .fontSize(9)
        .font('Helvetica')
        .text(`Date: ${d.statement_date.toLocaleDateString('en-IN')}`, 360, doc.y + 4, { width: R - 360, align: 'right' })
        .text(`Pod: ${d.pod_title}`, 360, doc.y + 2, { width: R - 360, align: 'right' });

      // Payable-to card
      y = Math.max(doc.y, y + 64) + 14;
      doc.roundedRect(L, y, R - L, 60, 10).fill(ACCENT_SOFT);
      doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold').text(`PAYABLE TO · ${beneficiaryLabel}`, L + 14, y + 12);
      doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(d.beneficiary_name, L + 14, y + 24);
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(d.beneficiary_email, L + 14, y + 40, { width: R - L - 28 });

      // Breakdown rows
      y += 60 + 22;
      doc.rect(L, y - 6, R - L, 24).fill(ACCENT);
      doc.fillColor('#ffffff').fontSize(9.5).font('Helvetica-Bold');
      doc.text('BREAKDOWN', L + 6, y, { width: 250 }).text('AMOUNT', 380, y, { width: R - 380, align: 'right' });
      y += 26;

      const rows = buildRows(d);
      for (const row of rows) {
        const isTotal = row.sign === '=';
        const prefix = row.sign === '-' ? '- ' : '';
        doc
          .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isTotal ? 12 : 10)
          .fillColor(isTotal ? INK : MUTED)
          .text(row.label, L + 6, y, { width: 280 })
          .fillColor(isTotal ? ACCENT : INK)
          .text(`${prefix}${fmt(row.value)}`, 360, y, { width: R - 360, align: 'right' });
        y = doc.y + (isTotal ? 6 : 8);
        doc.moveTo(L, y - 2).lineTo(R, y - 2).strokeColor(isTotal ? '#cbd5e1' : LINE).stroke();
        y += isTotal ? 4 : 2;
      }

      // Footer
      y += 16;
      const support = [
        d.invoice_support_email ? `Email: ${d.invoice_support_email}` : '',
        d.invoice_support_phone ? `Phone: ${d.invoice_support_phone}` : '',
      ]
        .filter(Boolean)
        .join('   ·   ');
      if (support) doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(support, L, y);
      if (d.invoice_terms) {
        doc.fillColor(INK).fontSize(8.5).font('Helvetica-Bold').text('Terms', L, doc.y + 12);
        doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(d.invoice_terms, L, doc.y + 2, { width: R - L });
      }
      doc
        .fontSize(8)
        .fillColor('#9ca3af')
        .text(
          d.invoice_footer_note ||
            'This payout statement is computer-generated and is shared once your pod completion is approved.',
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
