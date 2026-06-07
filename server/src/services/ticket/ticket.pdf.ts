import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface TicketPdfData {
  brand: string;
  ticket_code: string;
  status: string;
  qr_token: string;
  event_title: string;
  date_label: string;
  mode: string;
  venue_name: string | null;
  venue_address: string | null;
  meeting_platform: string | null;
  attendee_name: string;
  attendee_email: string;
}

const ACCENT = '#ff4f73';
const INK = '#111827';
const MUTED = '#6b7280';

/** Renders a single, designed event-ticket PDF with an embedded verifiable QR. */
export async function generateTicketPdf(data: TicketPdfData): Promise<Buffer> {
  const qrPng = await QRCode.toBuffer(data.qr_token, { margin: 1, width: 320, errorCorrectionLevel: 'M' });

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 0 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const H = doc.page.height;
      const stubX = W - 200;

      // Background + accent band
      doc.rect(0, 0, W, H).fill('#ffffff');
      doc.rect(0, 0, W, 64).fill(ACCENT);
      doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text(data.brand, 28, 22);
      doc.fontSize(10).font('Helvetica').text('EVENT TICKET', 28, 44);

      // Left: event details
      const leftX = 28;
      let y = 92;
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text('EVENT', leftX, y);
      y += 14;
      doc.fillColor(INK).fontSize(18).font('Helvetica-Bold').text(data.event_title, leftX, y, { width: stubX - leftX - 24 });
      y = doc.y + 10;

      const row = (label: string, value: string) => {
        doc.fillColor(MUTED).fontSize(8.5).font('Helvetica').text(label, leftX, y);
        doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(value || '—', leftX, y + 11, { width: stubX - leftX - 24 });
        y = doc.y + 8;
      };
      row('WHEN', data.date_label);
      row(data.mode === 'VIRTUAL' ? 'MEETING' : 'VENUE', data.mode === 'VIRTUAL' ? data.meeting_platform || 'Online' : data.venue_name || '—');
      if (data.mode !== 'VIRTUAL' && data.venue_address) row('ADDRESS', data.venue_address);
      row('ATTENDEE', `${data.attendee_name}  ·  ${data.attendee_email}`);

      // Perforation
      doc.save();
      doc.lineWidth(1).dash(4, { space: 4 }).strokeColor('#d1d5db');
      doc.moveTo(stubX, 64).lineTo(stubX, H).stroke();
      doc.restore();

      // Right stub: QR + code + status
      const qrSize = 150;
      const qrX = stubX + (200 - qrSize) / 2;
      doc.image(qrPng, qrX, 84, { width: qrSize, height: qrSize });
      doc.fillColor(MUTED).fontSize(8).font('Helvetica').text('SCAN AT ENTRY', stubX, 240, { width: 200, align: 'center' });
      doc.fillColor(INK).fontSize(13).font('Helvetica-Bold').text(data.ticket_code, stubX, 254, { width: 200, align: 'center' });
      doc.fillColor(data.status === 'CHECKED_IN' ? '#16a34a' : ACCENT).fontSize(9).font('Helvetica-Bold').text(data.status, stubX, 274, { width: 200, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
