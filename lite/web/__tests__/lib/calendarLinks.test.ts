import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** The module, built against a known public site URL (it is read once, at import). */
const load = async () => import('../../lib/calendarLinks');

const event = {
  slug: 'garden-party',
  title: 'Garden Party',
  description: 'Bring a picnic blanket.',
  start_at: '2026-11-21T13:30:00.000Z',
  end_at: '2026-11-21T16:00:00.000Z',
  location_type: 'IN_PERSON' as const,
  venue_name: 'Lodhi Garden',
  address: 'Lodhi Road, New Delhi',
};

const params = (url: string) => new URL(url).searchParams;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_LITE_SITE_URL', 'https://lite.example/');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('event and feed URLs', () => {
  it('builds absolute event and .ics links on the public site', async () => {
    const { eventIcsUrl, eventUrl } = await load();
    expect(eventUrl('garden-party')).toBe('https://lite.example/e/garden-party');
    expect(eventIcsUrl('garden-party')).toBe('https://lite.example/ics/event/garden-party.ics');
  });

  it('turns a calendar feed into a webcal:// subscription link', async () => {
    const { calendarWebcalUrl } = await load();
    expect(calendarWebcalUrl('run-club')).toBe('webcal://lite.example/ics/cal/run-club.ics');
  });

  it('swaps http for webcal too', async () => {
    vi.stubEnv('VITE_LITE_SITE_URL', 'http://localhost:2041');
    const { calendarWebcalUrl } = await load();
    expect(calendarWebcalUrl('run-club')).toBe('webcal://localhost:2041/ics/cal/run-club.ics');
  });
});

describe('googleCalendarUrl', () => {
  it('prefills a Google Calendar template with the title, UTC dates, details and place', async () => {
    const { googleCalendarUrl } = await load();
    const url = googleCalendarUrl(event, 'Online');

    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);
    const query = params(url);
    expect(query.get('action')).toBe('TEMPLATE');
    expect(query.get('text')).toBe('Garden Party');
    expect(query.get('dates')).toBe('20261121T133000Z/20261121T160000Z');
    expect(query.get('details')).toBe('Bring a picnic blanket.\n\nhttps://lite.example/e/garden-party');
    expect(query.get('location')).toBe('Lodhi Garden, Lodhi Road, New Delhi');
  });

  it('uses the online label as the place of a virtual event', async () => {
    const { googleCalendarUrl } = await load();
    expect(params(googleCalendarUrl({ ...event, location_type: 'VIRTUAL' }, 'Online')).get('location')).toBe('Online');
  });

  it('leaves out a missing venue or address instead of writing "null"', async () => {
    const { googleCalendarUrl } = await load();
    expect(params(googleCalendarUrl({ ...event, venue_name: null }, 'Online')).get('location')).toBe('Lodhi Road, New Delhi');
    expect(params(googleCalendarUrl({ ...event, address: null }, 'Online')).get('location')).toBe('Lodhi Garden');
  });

  it('keeps only the link when there is no description, and cuts a long one to 800 characters', async () => {
    const { googleCalendarUrl } = await load();
    expect(params(googleCalendarUrl({ ...event, description: undefined }, 'Online')).get('details')).toBe('https://lite.example/e/garden-party');

    const details = params(googleCalendarUrl({ ...event, description: 'x'.repeat(1000) }, 'Online')).get('details') ?? '';
    expect(details).toBe(`${'x'.repeat(800)}\n\nhttps://lite.example/e/garden-party`);
  });
});
