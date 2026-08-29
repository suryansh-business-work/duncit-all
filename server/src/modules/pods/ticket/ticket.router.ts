import { Router, type Request, type Response } from 'express';
import { logs } from '@observability/log';
import { verifyTicketPdfToken } from './ticket.download';
import { ticketService } from './ticket.service';

/**
 * The one way a ticket PDF leaves the server without a session.
 *
 *   GET /tickets/:token/ticket.pdf
 *
 * It is here for AiSensy: the booking confirmation's template has a DOCUMENT
 * header, and AiSensy fetches that document from a URL of its own accord — no
 * upload endpoint, no session, no header it could carry one in. Without this
 * route the send has no asset to name and falls back to the platform default,
 * which is how a placeholder ended up arriving beside real bookings.
 *
 * The URL ends in `.pdf` and the response says `application/pdf`, because the
 * fetcher on the other end decides what kind of file this is from what it is
 * given — that is the whole difference between a ticket and an attachment
 * nobody can open.
 *
 * Every rejection says the same thing: a caller holding a bad token learns
 * nothing about whether the ticket exists, and one holding a good token already
 * knows. See ticket.download.ts for what the token is and how long it lives.
 */

const NO_STORE = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
} as const;

async function serveTicketPdf(req: Request, res: Response): Promise<void> {
  const ticketDocId = verifyTicketPdfToken(String(req.params.token ?? ''));
  const file = ticketDocId ? await ticketService.pdfForLink(ticketDocId) : null;
  if (!file) {
    res.set(NO_STORE).status(404).type('text/plain').send('Not found\n');
    return;
  }
  res.set(NO_STORE).type('application/pdf').attachment(file.filename).send(file.pdf);
}

export function buildTicketRouter(): Router {
  const router = Router();

  router.get('/:token/ticket.pdf', (req, res) => {
    serveTicketPdf(req, res).catch((error) => {
      logs.server.error('ticket', 'download', { error });
      if (!res.headersSent) res.set(NO_STORE).status(500).type('text/plain').send('Error\n');
    });
  });

  return router;
}
