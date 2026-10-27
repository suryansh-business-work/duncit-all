import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { LiteCalendarModel } from '../../models/calendar.model';
import { LiteEventModel } from '../../models/event.model';
import type { LiteUserDoc } from '../../models/user.model';
import { buildIcsRouter } from '../../routes/ics';
import { notifications } from '../../services/notifications';
import { DAY, HOUR, hostedEvent, makeUser } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

withTestDatabase();

const app = express().use(buildIcsRouter());
let host: LiteUserDoc;

beforeEach(async () => {
  vi.spyOn(notifications, 'calendarPublished').mockImplementation(() => undefined);
  host = await makeUser({ email: 'hema@lite.test', handle: 'hema' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const unfolded = (text: string) => text.replaceAll('\r\n ', '');

describe('GET /ics/event/:slug.ics', () => {
  it('downloads one event as an iCalendar attachment', async () => {
    await hostedEvent(host);
    const res = await request(app).get('/ics/event/Sunday-Jazz-At-Bandra.ics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/calendar; charset=utf-8');
    expect(res.headers['content-disposition']).toBe('attachment; filename="sunday-jazz-at-bandra.ics"');
    const ics = unfolded(res.text);
    expect(ics).toContain('X-WR-CALNAME:Sunday Jazz at Bandra');
    expect(ics).toContain('SUMMARY:Sunday Jazz at Bandra');
    expect(ics).toContain('STATUS:CONFIRMED');
  });

  it('never puts the join link of an online event in the file', async () => {
    await hostedEvent(host, { location_type: 'VIRTUAL', virtual_link: 'https://meet.duncit.com/secret-room', venue_name: '', address: '' });
    const res = await request(app).get('/ics/event/sunday-jazz-at-bandra.ics');
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('meet.duncit.com');
    expect(unfolded(res.text)).toContain('LOCATION:\r\n');
  });

  it('still serves a cancelled event, marked cancelled', async () => {
    const event = await hostedEvent(host);
    await LiteEventModel.updateOne({ _id: event._id }, { $set: { status: 'CANCELLED' } });
    const res = await request(app).get('/ics/event/sunday-jazz-at-bandra.ics');
    expect(res.text).toContain('STATUS:CANCELLED');
  });

  it('answers 404 for a draft, a private, a hidden or an unknown event', async () => {
    await hostedEvent(host, { title: 'Draft Plan' }, false);
    await hostedEvent(host, { title: 'Private Dinner', visibility: 'PRIVATE' });
    const hidden = await hostedEvent(host, { title: 'Hidden Gig' });
    await LiteEventModel.updateOne({ _id: hidden._id }, { $set: { hidden: true } });
    for (const slug of ['draft-plan', 'private-dinner', 'hidden-gig', 'nothing-here']) {
      const res = await request(app).get(`/ics/event/${slug}.ics`);
      expect(res.status).toBe(404);
      expect(res.text).toBe('Not found');
    }
  });
});

describe('GET /ics/cal/:slug.ics', () => {
  it("feeds a calendar's public events from the last 30 days on, soonest first, cacheable", async () => {
    const calendar = await LiteCalendarModel.create({ owner_id: host._id, slug: 'hema-live', name: 'Hema Live' });
    const calendarId = String(calendar._id);
    const at = (days: number) => {
      const start = new Date(Date.now() + days * DAY);
      return { start_at: start.toISOString(), end_at: new Date(start.getTime() + 2 * HOUR).toISOString() };
    };
    await hostedEvent(host, { title: 'Next Month', calendar_id: calendarId, ...at(30) });
    await hostedEvent(host, { title: 'Tomorrow', calendar_id: calendarId, ...at(1) });
    await hostedEvent(host, { title: 'Last Week', calendar_id: calendarId, ...at(-7) });
    await hostedEvent(host, { title: 'Two Months Ago', calendar_id: calendarId, ...at(-60) });
    await hostedEvent(host, { title: 'Unlisted', calendar_id: calendarId, visibility: 'UNLISTED' });
    await hostedEvent(host, { title: 'Draft', calendar_id: calendarId }, false);
    await hostedEvent(host, { title: 'Online', calendar_id: calendarId, location_type: 'VIRTUAL', virtual_link: 'https://meet.duncit.com/secret' });

    const res = await request(app).get('/ics/cal/HEMA-LIVE.ics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/calendar; charset=utf-8');
    expect(res.headers['cache-control']).toBe('public, max-age=900');
    const summaries = unfolded(res.text)
      .split('\r\n')
      .filter((line) => line.startsWith('SUMMARY:'))
      .map((line) => line.slice('SUMMARY:'.length));
    expect(summaries).toEqual(['Last Week', 'Tomorrow', 'Online', 'Next Month']);
    expect(res.text).not.toContain('meet.duncit.com');
    expect(unfolded(res.text)).toContain('X-WR-CALNAME:Hema Live');
  });

  it('answers 404 for an unknown calendar', async () => {
    const res = await request(app).get('/ics/cal/nobody.ics');
    expect(res.status).toBe(404);
    expect(res.text).toBe('Not found');
  });
});
