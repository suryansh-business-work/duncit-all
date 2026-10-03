import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { shortLinkService } from './shortLink.service';
import { shortLinkClickService } from './shortLinkClick.service';
import { shortLinkJourneyService } from './shortLinkJourney.service';
import { SHORT_CODE_PATTERN } from './shortLink.codes';
import { cardForLink } from './shortLink.preview';
import { isLinkPreviewCrawler, renderCardHtml } from './shortLink.crawler';
import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';
import type { ConsentSignal } from './shortLinkClick.model';
import { consentFromCookie } from '@utils/consent';
import { UNFURL_HEADER } from '@utils/open-graph';

/**
 * The privacy signal this visitor's browser sent, if any.
 *
 * Both headers are set by the browser itself, never by our code, and both are
 * CORS-safelisted — so the landing-side report at `/v` carries them too
 * without a preflight. GPC is checked first because it is the current standard
 * and the one with legal weight; DNT is the older header people still set.
 *
 * What OBEYING it means is decided further in, by shortLinkClickService: the
 * click is still counted, but nothing that could single the visitor out is
 * written. An admin can switch that off, which is why the header is read here
 * and judged there.
 */
function consentSignalFrom(req: Request, consented: boolean): ConsentSignal | null {
  if (req.get('sec-gpc') === '1') return 'GPC';
  if (req.get('dnt') === '1') return 'DNT';
  return consented ? null : 'NO_CONSENT';
}

/**
 * Whether this visitor allowed marketing attribution. The redirect is a
 * navigation, so it carries the shared `.duncit.com` consent cookie; the
 * landing report is a credential-less fetch, so it carries `?c=1` instead
 * (SHORT_LINK_CONSENT_PARAM in @duncit/utils).
 */
const redirectConsented = (req: Request) => consentFromCookie(req.get('cookie')).marketing;
const landingConsented = (req: Request) => req.query.c === '1';

type PeekedLink = NonNullable<Awaited<ReturnType<typeof shortLinkService.peek>>>;

/**
 * The card document, or null when this destination has nothing to describe.
 *
 * Built fresh on every unfurl from the link as it is NOW — its current
 * destination and its current override — so re-pointing a link or editing its
 * card is what the very next crawler sees. `readPage` is false when the
 * request is itself one of our own card fetches (a link whose destination is
 * another short link): reading the page again would fetch this card forever.
 */
async function crawlerCardHtml(
  code: string,
  peeked: PeekedLink,
  readPage: boolean,
): Promise<string | null> {
  const { destination, link } = peeked;
  const card = await cardForLink(link, { readPage });
  if (!card) return null;
  const websiteUrl = (await getUrlConfigs()).websiteUrl.replace(/\/+$/, '');
  // The card names the SHORT link as its own address, not this hop: that is
  // what a reader shares on again, and the only address whose clicks count.
  return renderCardHtml({ card, destination, shareUrl: `${websiteUrl}/${code}` });
}

/**
 * Answer an unfurler with the card for whatever the link points at.
 *
 * Our entity pages are described from the database; every other destination —
 * internal or external — by its own tags, read live. Only a destination with
 * nothing readable and no override redirects after all, so it still gets to
 * describe itself. Every failure lands in that same branch.
 */
async function serveCrawlerCard(req: Request, res: Response, code: string): Promise<void> {
  const peeked = await shortLinkService.peek(code).catch((error) => {
    logs.server.error('shortLink', 'crawlerPeek', { error });
    return null;
  });
  if (!peeked) {
    res.status(404).type('text/plain').send('This link is no longer active.');
    return;
  }
  const readPage = !req.get(UNFURL_HEADER);
  const html = await crawlerCardHtml(code, peeked, readPage).catch((error) => {
    logs.server.error('shortLink', 'crawlerCard', { error });
    return null;
  });
  if (!html) {
    res.redirect(302, peeked.destination);
    return;
  }
  // Not cached by anything in between: an edited card or a re-pointed link
  // has to reach the next unfurl, not the one after a proxy's TTL runs out.
  res.type('html').set('Cache-Control', 'no-cache').send(html);
}

/**
 * The public short-link resolver behind duncit.com/<code>.
 *
 * The website's HTML server hands code-shaped paths here as a real redirect
 * (website/main-website/server/short-link.ts). Nothing about the destination
 * comes from the request — the code is looked up and the stored URL is
 * returned — so this can never be driven somewhere we did not choose.
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
          consentSignal: consentSignalFrom(req, landingConsented(req)),
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

    // A link-preview crawler gets the card for what the link points at, and
    // stops there — see shortLink.crawler.ts. Handled before anything is
    // counted, because an unfurl is not a visit.
    if (isLinkPreviewCrawler(req.get('user-agent'))) {
      await serveCrawlerCard(req, res, code);
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
        consentSignal: consentSignalFrom(req, redirectConsented(req)),
      })
      .catch((error) => logs.server.error('shortLink', 'recordClick', { error }));
  });

  return router;
}
