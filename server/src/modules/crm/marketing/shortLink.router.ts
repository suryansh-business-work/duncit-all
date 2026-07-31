import { Router } from 'express';
import { shortLinkService } from './shortLink.service';
import { SHORT_CODE_PATTERN } from './shortLink.codes';
import { logs } from '@observability/log';

/**
 * The public short-link resolver behind duncit.com/<code>.
 *
 * nginx carves codes out of the apex catch-all by regex and rewrites them to
 * /r/<code> here (deploy/nginx/duncit.com). Nothing about the destination comes
 * from the request — the code is looked up and the stored URL is returned —
 * so this can never be driven somewhere we did not choose.
 */
export function buildShortLinkRouter() {
  const router = Router();

  router.get('/:code', async (req, res) => {
    const code = String(req.params.code);
    // Reject anything that is not code-shaped before touching the database:
    // the apex sends real traffic here and a scanner will try every path.
    if (!SHORT_CODE_PATTERN.test(code)) {
      res.status(404).type('text/plain').send('Link not found.');
      return;
    }
    let destination: string | null = null;
    try {
      destination = await shortLinkService.resolve(code);
    } catch (error) {
      logs.server.error('shortLink', 'resolve', { error });
    }
    if (!destination) {
      res.status(404).type('text/plain').send('This link is no longer active.');
      return;
    }
    // 302, not 301: a permanent redirect would be cached by the browser and
    // every later click would never reach us, silently freezing the counts.
    res.redirect(302, destination);
  });

  return router;
}
