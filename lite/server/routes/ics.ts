import { Router } from 'express';
import { LiteCalendarModel } from '../models/calendar.model';
import { LiteEventModel } from '../models/event.model';
import { buildIcs } from '../services/ics';

const ICS_TYPE = 'text/calendar; charset=utf-8';

/**
 * GET /ics/event/:slug.ics — one event, for "Add to calendar".
 * GET /ics/cal/:slug.ics   — a calendar's upcoming public events, for a subscription feed.
 */
export function buildIcsRouter(): Router {
  const router = Router();

  router.get('/ics/event/:slug.ics', async (req, res) => {
    const slug = String(req.params.slug ?? '').toLowerCase();
    const event = await LiteEventModel.findOne({ slug, status: { $ne: 'DRAFT' }, hidden: false }).lean();
    if (!event || event.visibility === 'PRIVATE') {
      res.status(404).type('text/plain').send('Not found');
      return;
    }
    res.setHeader('Content-Type', ICS_TYPE);
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.ics"`);
    res.send(buildIcs(event.title, [{ ...event, virtual_link: '' }]));
  });

  router.get('/ics/cal/:slug.ics', async (req, res) => {
    const slug = String(req.params.slug ?? '').toLowerCase();
    const calendar = await LiteCalendarModel.findOne({ slug }).lean();
    if (!calendar) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }
    const events = await LiteEventModel.find({ calendar_id: calendar._id, status: 'PUBLISHED', hidden: false, visibility: 'PUBLIC', end_at: { $gte: new Date(Date.now() - 30 * 86_400_000) } })
      .sort({ start_at: 1 })
      .limit(200)
      .lean();
    res.setHeader('Content-Type', ICS_TYPE);
    res.setHeader('Cache-Control', 'public, max-age=900');
    res.send(buildIcs(calendar.name, events.map((e) => ({ ...e, virtual_link: '' }))));
  });

  return router;
}
