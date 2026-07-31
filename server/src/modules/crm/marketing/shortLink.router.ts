import crypto from 'node:crypto';
import { Router } from 'express';
import { shortLinkService } from './shortLink.service';
import { shortLinkClickService } from './shortLinkClick.service';
import { shortLinkJourneyService } from './shortLinkJourney.service';
import { SHORT_CODE_PATTERN } from './shortLink.codes';
import { logs } from '@observability/log';

/**
 * The public short-link resolver behind duncit.com/<code>.
 *
 * The website hands code-shaped paths here (website/main-website/src/lib/
 * short-link.ts). Nothing about the destination comes from the request — the
 * code is looked up and the stored URL is returned — so this can never be
 * driven somewhere we did not choose.
 */
export function buildShortLinkRouter() {
  const router = Router();

  /**
   * Landing-side visit report — every destination surface calls this at root
   * when its URL carries a short-link marker.
   *
   * `dlc` (a click id) says the redirect happened: its LANDED step is stamped.
   * `dl` (the code) alone says the redirect was SKIPPED — a shared tagged URL,
   * an app opening the destination directly — so the click is minted here,
   * verified against the database first. Unknown markers record nothing.
   *
   * Registered before /:code, which would otherwise swallow the path. Public
   * and credential-less, hence the wildcard CORS — production nginx strips
   * this header and applies its own.
   */
  router.get('/v', async (req, res) => {
    res.set({ 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
    const dlc = typeof req.query.dlc === 'string' ? req.query.dlc : null;
    const dl = typeof req.query.dl === 'string' ? req.query.dl : null;
    const referrer = typeof req.query.dr === 'string' ? req.query.dr : null;
    try {
      // The click id names the exact click; fall through to the code when it
      // no longer resolves, so a stale stored id still lands somewhere real.
      if (dlc && (await shortLinkJourneyService.recordStep(dlc, 'LANDED'))) {
        res.json({ click_id: dlc });
        return;
      }
      if (dl && SHORT_CODE_PATTERN.test(dl)) {
        const clickId = await shortLinkService.visit(dl, {
          referrer,
          userAgent: req.get('user-agent'),
          forwardedFor: req.get('x-forwarded-for'),
          remoteAddress: req.socket.remoteAddress,
        });
        res.json({ click_id: clickId });
        return;
      }
    } catch (error) {
      logs.server.error('shortLink', 'visit', { error });
    }
    res.json({ click_id: null });
  });

  router.get('/:code', async (req, res) => {
    const code = String(req.params.code);
    // Reject anything that is not code-shaped before touching the database:
    // the apex sends real traffic here and a scanner will try every path.
    if (!SHORT_CODE_PATTERN.test(code)) {
      res.status(404).type('text/plain').send('Link not found.');
      return;
    }

    // The visitor's ORIGINAL referrer, forwarded by the website as `dr`. By the
    // time the browser reaches this hop document.referrer says duncit.com, so
    // without this every click would look like it came from our own site.
    const referrer = typeof req.query.dr === 'string' ? req.query.dr : null;
    const clickId = crypto.randomUUID();

    let resolved: { destination: string; shortLinkId: string } | null = null;
    try {
      resolved = await shortLinkService.resolve(code, new Date(), clickId);
    } catch (error) {
      logs.server.error('shortLink', 'resolve', { error });
    }
    if (!resolved) {
      res.status(404).type('text/plain').send('This link is no longer active.');
      return;
    }

    // 302, not 301: a permanent redirect would be cached by the browser and
    // every later click would never reach us, silently freezing the counts.
    res.redirect(302, resolved.destination);

    // Recorded after the response, and deliberately not awaited — the visitor
    // is already on their way and must never wait on analytics.
    shortLinkClickService
      .record({
        clickId,
        code,
        shortLinkId: resolved.shortLinkId,
        referrer,
        userAgent: req.get('user-agent'),
        forwardedFor: req.get('x-forwarded-for'),
        remoteAddress: req.socket.remoteAddress,
      })
      .catch((error) => logs.server.error('shortLink', 'recordClick', { error }));
  });

  return router;
}
