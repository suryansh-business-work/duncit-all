import { Router } from 'express';
import { TRACKING_PIXEL, campaignTrackingService } from './tracking.service';
import { logs } from '@observability/log';

/**
 * Public campaign-tracking endpoints, hit by mail clients rather than by our
 * own apps: no auth, no CORS, and never an error page — a broken pixel or a
 * dead-end link is a worse outcome for the recipient than a lost count.
 */
export function buildCampaignTrackingRouter() {
  const router = Router();

  // The open pixel. Always returns the image, even for an unknown campaign:
  // a mail client showing a broken-image icon would tell the recipient they
  // are being counted, which is not the pixel's business to announce.
  router.get('/o/:campaignId', async (req, res) => {
    try {
      await campaignTrackingService.recordOpen(String(req.params.campaignId));
    } catch (error) {
      logs.server.error('campaignTracking', 'recordOpen', { error });
    }
    res.set({
      'Content-Type': 'image/gif',
      // Proxies caching the pixel would swallow every open after the first.
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.end(TRACKING_PIXEL);
  });

  // A tracked link. The index resolves against the campaign's stored link
  // table, so this endpoint can only ever send someone to a URL that was in
  // the email we sent.
  router.get('/c/:campaignId/:index', async (req, res) => {
    const index = Number.parseInt(String(req.params.index), 10);
    const url = await campaignTrackingService.resolveClick(String(req.params.campaignId), index);
    if (!url) {
      res.status(404).type('text/plain').send('This link has expired.');
      return;
    }
    res.redirect(302, url);
  });

  // Every image in the email comes through here, so a picture the recipient
  // chose to load counts as evidence the mail was opened even when the 1×1
  // pixel was blocked. An unresolvable index falls back to the pixel rather
  // than a 404 — a broken image in someone's inbox helps nobody.
  router.get('/i/:campaignId/:index', async (req, res) => {
    const index = Number.parseInt(String(req.params.index), 10);
    let url: string | null = null;
    try {
      url = await campaignTrackingService.recordImageLoad(String(req.params.campaignId), index);
    } catch (error) {
      logs.server.error('campaignTracking', 'recordImageLoad', { error });
    }
    if (!url) {
      res.set('Content-Type', 'image/gif').end(TRACKING_PIXEL);
      return;
    }
    res.redirect(302, url);
  });

  return router;
}
