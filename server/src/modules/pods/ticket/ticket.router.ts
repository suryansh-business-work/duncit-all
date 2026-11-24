import { Router, type Request, type Response } from 'express';
import { logs } from '@observability/log';
import { googleWalletLogo } from '@services/ticket/wallet-images';
import { verifyTicketPassToken, verifyTicketPdfToken } from './ticket.download';
import { ticketService } from './ticket.service';
import { walletService } from './wallet/wallet.service';

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

/**
 * "Add to Apple Wallet". Served inline with the pkpass type, so Safari hands
 * the file straight to Wallet's add sheet instead of saving it to Downloads.
 */
async function serveApplePass(req: Request, res: Response): Promise<void> {
  const ticketDocId = verifyTicketPassToken(String(req.params.token ?? ''));
  const file = ticketDocId ? await walletService.applePassForLink(ticketDocId) : null;
  if (!file) {
    res.set(NO_STORE).status(404).type('text/plain').send('Not found\n');
    return;
  }
  res
    .set({ ...NO_STORE, 'Content-Disposition': `inline; filename="${file.filename}"` })
    .type('application/vnd.apple.pkpass')
    .send(file.pass);
}

/** The logo Google Wallet fetches for every ticket class: public brand art, cacheable. */
async function serveWalletLogo(_req: Request, res: Response): Promise<void> {
  const png = await googleWalletLogo();
  res.set('Cache-Control', 'public, max-age=86400').type('image/png').send(png);
}

/** One handler shape for every route here: a failure is logged and answered, never left hanging. */
const handle =
  (action: string, serve: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response) => {
    serve(req, res).catch((error) => {
      logs.server.error('ticket', action, { error });
      if (!res.headersSent) res.set(NO_STORE).status(500).type('text/plain').send('Error\n');
    });
  };

export function buildTicketRouter(): Router {
  const router = Router();

  router.get('/:token/ticket.pdf', handle('download', serveTicketPdf));
  router.get('/:token/ticket.pkpass', handle('applePass', serveApplePass));
  router.get('/wallet-logo.png', handle('walletLogo', serveWalletLogo));

  return router;
}
