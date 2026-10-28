import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from '../../../layout/header/nav';

const item = (to: string) => {
  const found = NAV_ITEMS.find((entry) => entry.to === to);
  if (!found) throw new Error(`no nav item for ${to}`);
  return found;
};

describe('NAV_ITEMS', () => {
  it('lists Events and Calendars for a signed-in reader, and Discover for everyone', () => {
    expect(NAV_ITEMS.map(({ to, labelKey, signedIn }) => ({ to, labelKey, signedIn: signedIn === true }))).toEqual([
      { to: '/home', labelKey: 'liteWeb.nav.events', signedIn: true },
      { to: '/calendars', labelKey: 'liteWeb.nav.calendars', signedIn: true },
      { to: '/discover', labelKey: 'liteWeb.nav.discover', signedIn: false },
    ]);
  });

  it('lights Events up on your own lists and on the host pages of an event', () => {
    const { match } = item('/home');
    for (const path of ['/home', '/hosting', '/tickets', '/tickets/reg-1', '/create', '/e/garden-party/manage', '/e/garden-party/edit', '/e/garden-party/scan']) {
      expect(match(path)).toBe(true);
    }
  });

  it('leaves Events dark on a public event page and elsewhere', () => {
    const { match } = item('/home');
    for (const path of ['/', '/e/garden-party', '/discover', '/calendars', '/u/asha']) {
      expect(match(path)).toBe(false);
    }
  });

  it('lights Calendars up on the calendar list and its forms, not on a public calendar', () => {
    const { match } = item('/calendars');
    expect(match('/calendars')).toBe(true);
    expect(match('/calendars/new')).toBe(true);
    expect(match('/calendars/cal-1/edit')).toBe(true);
    expect(match('/cal/run-club')).toBe(false);
  });

  it('lights Discover up on discovery, categories and search, not on a city page', () => {
    const { match } = item('/discover');
    expect(match('/discover')).toBe(true);
    expect(match('/category/music')).toBe(true);
    expect(match('/search')).toBe(true);
    expect(match('/delhi')).toBe(false);
    expect(match('/home')).toBe(false);
  });
});
