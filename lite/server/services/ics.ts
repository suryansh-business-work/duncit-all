import { env } from '../config/env';
import type { LiteEvent } from '../models/event.model';

/** `2026-09-19T14:30:00.000Z` -> `20260919T143000Z`, the iCalendar UTC form. */
const stamp = (date: Date): string => date.toISOString().replaceAll(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

/** iCalendar text escaping (RFC 5545 3.3.11). */
const escapeText = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll(';', String.raw`\;`).replaceAll(',', String.raw`\,`).replaceAll(/\r?\n/g, String.raw`\n`);

/** Lines longer than 75 octets are folded with a leading space (RFC 5545 3.1). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

export type IcsEvent = Pick<LiteEvent, 'title' | 'description' | 'start_at' | 'end_at' | 'address' | 'venue_name' | 'virtual_link' | 'slug' | 'status'> & {
  _id: unknown;
  updated_at?: Date | null;
};

function locationOf(event: IcsEvent): string {
  if (event.virtual_link) return event.virtual_link;
  return [event.venue_name, event.address].filter(Boolean).join(', ');
}

export function eventLines(event: IcsEvent): string[] {
  const url = `${env.siteUrl}/e/${event.slug}`;
  return [
    'BEGIN:VEVENT',
    `UID:lite-${String(event._id)}@duncit.com`,
    `DTSTAMP:${stamp(event.updated_at ?? new Date())}`,
    `DTSTART:${stamp(event.start_at)}`,
    `DTEND:${stamp(event.end_at)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(`${event.description}\n\n${url}`)}`,
    `LOCATION:${escapeText(locationOf(event))}`,
    `URL:${url}`,
    `STATUS:${event.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
  ];
}

/** A whole calendar file: one event, or a feed of many. */
export function buildIcs(name: string, events: IcsEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Duncit Lite//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    ...events.flatMap(eventLines),
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** The "Add to Google Calendar" link the event page offers. */
export function googleCalendarUrl(event: IcsEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${stamp(event.start_at)}/${stamp(event.end_at)}`,
    details: `${event.description}\n\n${env.siteUrl}/e/${event.slug}`,
    location: locationOf(event),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
