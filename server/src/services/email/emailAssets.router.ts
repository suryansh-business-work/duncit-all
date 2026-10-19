import path from 'node:path';
import express, { type Router } from 'express';

/**
 * The email icon PNGs (`catalogue/icons.ts`), served to whoever opens a mail.
 *
 * Public by necessity — a mail client fetches an image with no session — and
 * harmless: the folder holds only the committed icons, nothing per-user. They
 * change only when `scripts/generate-email-icons.ts` is re-run, so clients and
 * image proxies (Gmail's among them) may cache them for a week.
 */
export function buildEmailAssetsRouter(): Router {
  const router = express.Router();
  router.use(
    express.static(path.resolve(__dirname, '../_assets/email-icons'), {
      index: false,
      dotfiles: 'ignore',
      maxAge: '7d',
    })
  );
  return router;
}
