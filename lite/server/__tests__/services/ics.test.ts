import { describe, expect, it, vi } from 'vitest';
import { buildIcs, eventLines, googleCalendarUrl, type IcsEvent } from '../../services/ics';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, siteUrl: 'https://lite.duncit.test' } };
});

const jazz: IcsEvent = {
  _id: '507f1f77bcf86cd799439011',
  slug: 'sunday-jazz',
  title: 'Jazz; Blues, and \\ more',
  description: 'Line one\nLine two',
  start_at: new Date('2026-11-01T13:00:00.000Z'),
  end_at: new Date('2026-11-01T16:30:00.000Z'),
  updated_at: new Date('2026-10-20T08:15:00.000Z'),
  venue_name: 'The Terrace',
  address: '14 Hill Road',
  virtual_link: '',
  status: 'PUBLISHED',
};

/** RFC 5545 unfolding: a CRLF followed by a space continues the previous line. */
const unfold = (ics: string) => ics.replaceAll('\r\n ', '').split('\r\n');

describe('eventLines', () => {
  it('writes one VEVENT with UTC stamps, escaped text and the event page', () => {
    expect(eventLines(jazz)).toEqual([
      'BEGIN:VEVENT',
      'UID:lite-507f1f77bcf86cd799439011@duncit.com',
      'DTSTAMP:20261020T081500Z',
      'DTSTART:20261101T130000Z',
      'DTEND:20261101T163000Z',
      String.raw`SUMMARY:Jazz\; Blues\, and \\ more`,
      String.raw`DESCRIPTION:Line one\nLine two\n\nhttps://lite.duncit.test/e/sunday-jazz`,
      String.raw`LOCATION:The Terrace\, 14 Hill Road`,
      'URL:https://lite.duncit.test/e/sunday-jazz',
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ]);
  });

  it('uses the join link as the location of an online event, and marks a cancelled one', () => {
    const lines = eventLines({ ...jazz, virtual_link: 'https://meet.duncit.com/jazz', status: 'CANCELLED' });
    expect(lines).toContain('LOCATION:https://meet.duncit.com/jazz');
    expect(lines).toContain('STATUS:CANCELLED');
  });

  it('stamps an event with no update time with the current time', () => {
    const [stamp] = eventLines({ ...jazz, updated_at: null }).filter((line) => line.startsWith('DTSTAMP:'));
    expect(stamp).toMatch(/^DTSTAMP:\d{8}T\d{6}Z$/);
  });
});

describe('buildIcs', () => {
  it('wraps the events in a calendar with CRLF line endings', () => {
    const ics = buildIcs('Hema, Live', [jazz]);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replaceAll('\r\n', '')).not.toContain('\n');
    const lines = unfold(ics);
    expect(lines.slice(0, 6)).toEqual(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Duncit Lite//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', String.raw`X-WR-CALNAME:Hema\, Live`]);
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(1);
  });

  it('folds long lines to 75 octets, which unfold back to the original', () => {
    const long = { ...jazz, description: 'A very long description of the evening. '.repeat(10).trim() };
    const ics = buildIcs('Feed', [long, { ...jazz, _id: 'second' }]);
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75);
    const description = unfold(ics).find((line) => line.startsWith('DESCRIPTION:'));
    expect(description).toBe(`DESCRIPTION:${long.description}${String.raw`\n\n`}https://lite.duncit.test/e/sunday-jazz`);
    expect(unfold(ics).filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(2);
  });

  it('writes an empty feed for a calendar with no events', () => {
    expect(unfold(buildIcs('Empty', [])).filter(Boolean)).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Duncit Lite//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Empty',
      'END:VCALENDAR',
    ]);
  });
});

describe('googleCalendarUrl', () => {
  it('pre-fills Google Calendar with the title, dates, details and place', () => {
    const url = new URL(googleCalendarUrl(jazz));
    expect(`${url.origin}${url.pathname}`).toBe('https://calendar.google.com/calendar/render');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: 'TEMPLATE',
      text: 'Jazz; Blues, and \\ more',
      dates: '20261101T130000Z/20261101T163000Z',
      details: 'Line one\nLine two\n\nhttps://lite.duncit.test/e/sunday-jazz',
      location: 'The Terrace, 14 Hill Road',
    });
  });
});
