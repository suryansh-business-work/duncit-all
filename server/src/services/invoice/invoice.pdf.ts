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
}

export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 48 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const cur = data.currency_symbol;
      const fmt = (n: number) => `${cur}${n.toFixed(2)}`;

      // Header
      doc.fontSize(22).fillColor('#1976d2').text(data.business_name, { align: 'left' });
      doc
        .fontSize(9)
        .fillColor('#555')
        .text(data.business_address || '', { align: 'left' });
      if (data.business_gstin) doc.text(`GSTIN: ${data.business_gstin}`);
      doc.moveDown();

      // Invoice meta
      doc.fontSize(18).fillColor('#000').text('TAX INVOICE', { align: 'right' });
      doc
        .fontSize(10)
        .fillColor('#333')
        .text(`Invoice No: ${data.invoice_no}`, { align: 'right' })
        .text(`Date: ${data.invoice_date.toLocaleDateString('en-IN')}`, { align: 'right' })
        .text(`Payment ID: ${data.payment_id}`, { align: 'right' });

      doc.moveDown(1.5);

      // Bill To
      doc.fontSize(11).fillColor('#000').text('Bill To:', { underline: true });
      doc
        .fontSize(10)
        .fillColor('#333')
        .text(data.customer_name)
        .text(data.customer_email);
      if (data.customer_phone) doc.text(data.customer_phone);

      doc.moveDown(1.5);

      // Table header
      const tableTop = doc.y;
      const colX = { desc: 48, qty: 320, price: 380, amount: 470 };
      doc
        .fontSize(10)
        .fillColor('#fff')
        .rect(40, tableTop - 4, 520, 20)
        .fill('#1976d2');
      doc
        .fillColor('#fff')
        .text('Description', colX.desc, tableTop)
        .text('Qty', colX.qty, tableTop, { width: 50, align: 'right' })
        .text('Price', colX.price, tableTop, { width: 80, align: 'right' })
        .text('Amount', colX.amount, tableTop, { width: 80, align: 'right' });

      let y = tableTop + 24;
      doc.fillColor('#000').fontSize(10);
      for (const it of data.items) {
        doc
          .text(it.description, colX.desc, y, { width: 260 })
          .text(String(it.qty), colX.qty, y, { width: 50, align: 'right' })
          .text(fmt(it.unit_price), colX.price, y, { width: 80, align: 'right' })
          .text(fmt(it.amount), colX.amount, y, { width: 80, align: 'right' });
        y += 20;
      }

      // Totals
      y += 10;
      doc.moveTo(40, y).lineTo(560, y).strokeColor('#ddd').stroke();
      y += 10;

      const totalsRow = (label: string, value: string, bold = false) => {
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(bold ? 12 : 10)
          .fillColor(bold ? '#000' : '#444')
          .text(label, 320, y, { width: 150, align: 'right' })
          .text(value, 470, y, { width: 80, align: 'right' });
        y += bold ? 20 : 16;
      };

      totalsRow('Subtotal', fmt(data.subtotal));
      totalsRow(`Platform Fee (${data.platform_fee_pct}%)`, fmt(data.platform_fee_amount));
      totalsRow(`GST (${data.gst_pct}%)`, fmt(data.gst_amount));
      y += 4;
      doc.moveTo(320, y - 2).lineTo(560, y - 2).strokeColor('#999').stroke();
      totalsRow('Total Paid', fmt(data.total), true);

      // Footer
      doc.moveDown(4);
      doc
        .fontSize(9)
        .fillColor('#888')
        .text(`Payment method: ${data.payment_method}`, 48, doc.y);
      doc
        .fontSize(8)
        .fillColor('#aaa')
        .text(
          'This is a computer-generated invoice and does not require a signature.',
          48,
          doc.y + 6,
          { align: 'center', width: 500 }
        );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
