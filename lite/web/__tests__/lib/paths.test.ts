import { describe, expect, it } from 'vitest';
import { paths } from '../../lib/paths';

describe('paths', () => {
  it('names the fixed pages', () => {
    expect(paths.home).toBe('/');
    expect(paths.events).toBe('/home');
    expect(paths.discover).toBe('/discover');
    expect(paths.create).toBe('/create');
    expect(paths.tickets).toBe('/tickets');
    expect(paths.hosting).toBe('/hosting');
    expect(paths.calendars).toBe('/calendars');
    expect(paths.calendarNew).toBe('/calendars/new');
    expect(paths.profile).toBe('/profile');
    expect(paths.signIn).toBe('/signin');
  });

  it('builds the pages that carry a slug, id or handle', () => {
    expect(paths.city('delhi')).toBe('/delhi');
    expect(paths.category('music')).toBe('/category/music');
    expect(paths.event('garden-party')).toBe('/e/garden-party');
    expect(paths.eventEdit('garden-party')).toBe('/e/garden-party/edit');
    expect(paths.eventManage('garden-party')).toBe('/e/garden-party/manage');
    expect(paths.eventScan('garden-party')).toBe('/e/garden-party/scan');
    expect(paths.ticket('reg-1')).toBe('/tickets/reg-1');
    expect(paths.calendarEdit('cal-1')).toBe('/calendars/cal-1/edit');
    expect(paths.calendar('run-club')).toBe('/cal/run-club');
    expect(paths.user('asha')).toBe('/u/asha');
    expect(paths.settings()).toBe('/settings');
  });

  it('opens a page on a tab under the key the tab strip reads', () => {
    expect(paths.eventManage('garden-party', 'more')).toBe('/e/garden-party/manage?selectedtab=more');
    expect(paths.settings('payment')).toBe('/settings?selectedtab=payment');
  });

  it('encodes a search so spaces, ampersands and hashes survive the query string', () => {
    expect(paths.search('run club & brunch #1')).toBe('/search?q=run%20club%20%26%20brunch%20%231');
    expect(new URLSearchParams(paths.search('a&b=c').split('?')[1]).get('q')).toBe('a&b=c');
  });

  it('points calendar apps at the .ics feeds', () => {
    expect(paths.ics.event('garden-party')).toBe('/ics/event/garden-party.ics');
    expect(paths.ics.calendar('run-club')).toBe('/ics/cal/run-club.ics');
  });
});
