import { formatInTimeZone } from 'date-fns-tz';
import { LiteEventModel } from '../models/event.model';
import { LiteEventViewModel } from '../models/eventView.model';
import { LiteRegistrationModel } from '../models/registration.model';
import type { LiteUserDoc } from '../models/user.model';
import { wholeNumber } from '../utils/validate';
import { eventService } from './event.service';
import { isHostOf } from './projections';

const DAY_MS = 86_400_000;
/** The windows the Insights tab offers. */
export const INSIGHT_WINDOWS = { min: 1, max: 90 } as const;

const dayIn = (date: Date, zone: string): string => formatInTimeZone(date, zone || 'Asia/Kolkata', 'yyyy-MM-dd');

/** Every day of the window, oldest first, so a chart has no gaps. */
function windowDays(days: number, zone: string): string[] {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => dayIn(new Date(now - (days - 1 - i) * DAY_MS), zone));
}

export const insightsService = {
  /**
   * Count one page view. Hosts looking at their own page are not counted, and
   * a missing or unlisted-to-them event is ignored rather than reported — this
   * is fire-and-forget from the page, never an error a visitor sees.
   */
  async trackView(slug: string, user: LiteUserDoc | null): Promise<boolean> {
    const event = await LiteEventModel.findOne({ slug: String(slug ?? '').toLowerCase(), status: 'PUBLISHED', hidden: false }).lean();
    if (!event) return false;
    const viewer = user ? { id: String(user._id), is_admin: user.is_admin } : null;
    if (isHostOf(event, viewer)) return false;
    await LiteEventViewModel.updateOne({ event_id: event._id, day: dayIn(new Date(), event.timezone) }, { $inc: { views: 1 } }, { upsert: true });
    return true;
  },

  /** Page views and registrations per day over the last `days`, for the event's hosts. */
  async forEvent(user: LiteUserDoc, eventId: string, rawDays: number | null | undefined) {
    const days = wholeNumber(rawDays ?? 7, 'Days', INSIGHT_WINDOWS);
    const event = await eventService.requireHosted(eventId, user);
    const range = windowDays(days, event.timezone);
    const since = new Date(Date.now() - days * DAY_MS);
    const [views, registrations] = await Promise.all([
      LiteEventViewModel.find({ event_id: event._id, day: { $gte: range[0] } }).lean(),
      LiteRegistrationModel.find({ event_id: event._id, created_at: { $gte: since } }, { created_at: 1 }).lean(),
    ]);
    const viewsByDay = new Map(views.map((v) => [v.day, v.views]));
    const regsByDay = new Map<string, number>();
    for (const reg of registrations) {
      const day = dayIn(reg.created_at as Date, event.timezone);
      regsByDay.set(day, (regsByDay.get(day) ?? 0) + 1);
    }
    const series = range.map((day) => ({ day, views: viewsByDay.get(day) ?? 0, registrations: regsByDay.get(day) ?? 0 }));
    return {
      days,
      total_views: series.reduce((sum, d) => sum + d.views, 0),
      total_registrations: series.reduce((sum, d) => sum + d.registrations, 0),
      series,
    };
  },
};
