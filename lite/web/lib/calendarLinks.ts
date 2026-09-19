import { SITE_URL } from '../../shared/env';
import { paths } from './paths';

interface CalendarEventLike {
  slug: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  location_type: 'IN_PERSON' | 'VIRTUAL';
  venue_name: string | null;
  address?: string | null;
}

/** An instant as Google Calendar's `dates` parameter wants it: 20260921T133000Z. */
const stamp = (iso: string): string => new Date(iso).toISOString().replaceAll(/[-:]|\.\d{3}/g, '');

/** The absolute address of an event page, for sharing and calendar entries. */
export const eventUrl = (slug: string): string => `${SITE_URL}${paths.event(slug)}`;

/** The absolute ICS feed of an event. */
export const eventIcsUrl = (slug: string): string => `${SITE_URL}${paths.ics.event(slug)}`;

/** A calendar's feed as a webcal:// link, which calendar apps open as a subscription. */
export const calendarWebcalUrl = (slug: string): string => `${SITE_URL.replace(/^https?:/, 'webcal:')}${paths.ics.calendar(slug)}`;

/** A prefilled "add to Google Calendar" link. */
export function googleCalendarUrl(event: CalendarEventLike, onlineLabel: string): string {
  const location = event.location_type === 'VIRTUAL' ? onlineLabel : [event.venue_name, event.address].filter(Boolean).join(', ');
  const details = [event.description?.slice(0, 800) ?? '', eventUrl(event.slug)].filter(Boolean).join('\n\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${stamp(event.start_at)}/${stamp(event.end_at)}`,
    details,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
