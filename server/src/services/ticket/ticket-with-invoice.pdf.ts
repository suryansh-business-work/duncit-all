import PDFDocument from 'pdfkit';
import {
  drawInvoice,
  INVOICE_PAGE,
  invoiceLogo,
  type InvoiceData,
} from '@services/invoice/invoice.pdf';
import { drawTicket, TICKET_PAGE, ticketQr, type TicketPdfData } from './ticket.pdf';

/**
 * The ticket and its invoice, as one document.
 *
 * Page one is the ticket, at the size it has always been; page two is the
 * invoice for the booking that paid for it, drawn by the same renderer the
 * receipt email uses. One file rather than two because a buyer arriving at a
 * door and a buyer filing an expense are the same person, and asking them to
 * keep track of which of two attachments is which is asking them to lose one.
 *
 * A pod that was free has no payment and therefore no invoice — that document
 * is the ticket alone, not a ticket followed by an empty page.
 *
 * pdfkit allows a per-page size, which is what lets an A5 landscape ticket and
 * an A4 invoice share a file without either being letterboxed to fit the other.
 */
export async function generateTicketWithInvoicePdf(
  ticket: TicketPdfData,
  invoice: InvoiceData | null
): Promise<Buffer> {
  // Both of the asynchronous parts first: nothing can be awaited once drawing
  // starts, because pdfkit writes pages in the order the calls are made.
  const qrPng = await ticketQr(ticket.qr_token);
  const logo = invoice ? await invoiceLogo(invoice.invoice_logo_url) : null;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument(TICKET_PAGE);
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawTicket(doc, ticket, qrPng);
      if (invoice) {
        doc.addPage(INVOICE_PAGE);
        drawInvoice(doc, invoice, logo);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
