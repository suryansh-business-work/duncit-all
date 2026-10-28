import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatInTimeZone } from 'date-fns-tz';
import { LiteEventModel, type LiteEventDoc } from '../../models/event.model';
import { LiteEventViewModel } from '../../models/eventView.model';
import { LiteRegistrationModel } from '../../models/registration.model';
import type { LiteUserDoc } from '../../models/user.model';
import { INSIGHT_WINDOWS, insightsService } from '../../services/insights.service';
import { notifications } from '../../services/notifications';
import { apiError, badInputError } from '../helpers/expect';
import { DAY, hostedEvent, makeUser, seedRegistration } from '../helpers/fixtures';
import { withTestDatabase } from '../helpers/mongo';

withTestDatabase();

const ZONE = 'Asia/Kolkata';
const dayAgo = (days: number) => formatInTimeZone(new Date(Date.now() - days * DAY), ZONE, 'yyyy-MM-dd');

let host: LiteUserDoc;
let event: LiteEventDoc;

beforeEach(async () => {
  vi.spyOn(notifications, 'calendarPublished').mockImplementation(() => undefined);
  host = await makeUser({ email: 'hema@lite.test', handle: 'hema' });
  event = await hostedEvent(host);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const viewsToday = async () => (await LiteEventViewModel.findOne({ event_id: event._id, day: dayAgo(0) }).lean())?.views ?? 0;

describe('insightsService.trackView', () => {
  it("counts anonymous and signed-in visitors on today's row, in the event's zone", async () => {
    await expect(insightsService.trackView('sunday-jazz-at-bandra', null)).resolves.toBe(true);
    await expect(insightsService.trackView('SUNDAY-JAZZ-AT-BANDRA', await makeUser())).resolves.toBe(true);
    expect(await viewsToday()).toBe(2);
    expect(await LiteEventViewModel.countDocuments({})).toBe(1);
  });

  it("does not count a host looking at their own page", async () => {
    await expect(insightsService.trackView('sunday-jazz-at-bandra', host)).resolves.toBe(false);
    expect(await viewsToday()).toBe(0);
  });

  it('ignores unknown, unpublished and hidden events', async () => {
    await expect(insightsService.trackView('no-such-event', null)).resolves.toBe(false);
    await hostedEvent(host, { title: 'Draft Plan' }, false);
    await expect(insightsService.trackView('draft-plan', null)).resolves.toBe(false);
    await LiteEventModel.updateOne({ _id: event._id }, { $set: { hidden: true } });
    await expect(insightsService.trackView('sunday-jazz-at-bandra', null)).resolves.toBe(false);
    expect(await LiteEventViewModel.countDocuments({})).toBe(0);
  });
});

describe('insightsService.forEvent', () => {
  it('answers a zero-filled week by default, oldest day first, ending today', async () => {
    const insights = await insightsService.forEvent(host, String(event._id), null);
    expect(insights.days).toBe(7);
    expect(insights.series).toHaveLength(7);
    expect(insights.series[0].day).toBe(dayAgo(6));
    expect(insights.series[6].day).toBe(dayAgo(0));
    expect(insights.series.every((d) => d.views === 0 && d.registrations === 0)).toBe(true);
    expect(insights).toMatchObject({ total_views: 0, total_registrations: 0 });
  });

  it('puts views and registrations on their days and totals them', async () => {
    await LiteEventViewModel.create({ event_id: event._id, day: dayAgo(0), views: 5 });
    await LiteEventViewModel.create({ event_id: event._id, day: dayAgo(2), views: 3 });
    await LiteEventViewModel.create({ event_id: event._id, day: dayAgo(30), views: 99 });
    await seedRegistration(event, await makeUser());
    await seedRegistration(event, await makeUser());
    const old = await seedRegistration(event, await makeUser());
    await LiteRegistrationModel.collection.updateOne({ _id: old._id }, { $set: { created_at: new Date(Date.now() - 20 * DAY) } });

    const insights = await insightsService.forEvent(host, String(event._id), 7);

    expect(insights.series.find((d) => d.day === dayAgo(0))).toEqual({ day: dayAgo(0), views: 5, registrations: 2 });
    expect(insights.series.find((d) => d.day === dayAgo(2))).toEqual({ day: dayAgo(2), views: 3, registrations: 0 });
    expect(insights).toMatchObject({ total_views: 8, total_registrations: 2 });
  });

  it('offers windows from 1 to 90 days only', async () => {
    expect(INSIGHT_WINDOWS).toEqual({ min: 1, max: 90 });
    await expect(insightsService.forEvent(host, String(event._id), 1)).resolves.toMatchObject({ days: 1, series: [{ day: dayAgo(0) }] });
    expect((await insightsService.forEvent(host, String(event._id), 90)).series).toHaveLength(90);
    await expect(insightsService.forEvent(host, String(event._id), 0)).rejects.toMatchObject(badInputError('Days must be at least 1'));
    await expect(insightsService.forEvent(host, String(event._id), 91)).rejects.toMatchObject(badInputError('Days cannot be more than 90'));
    await expect(insightsService.forEvent(host, String(event._id), 2.5)).rejects.toMatchObject(badInputError('Days must be a whole number'));
  });

  it("is for the event's hosts only", async () => {
    await expect(insightsService.forEvent(await makeUser(), String(event._id), 7)).rejects.toMatchObject(apiError('FORBIDDEN', 'Only a host of this event can do that'));
  });
});
