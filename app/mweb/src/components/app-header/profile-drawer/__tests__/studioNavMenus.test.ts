import { describe, expect, it } from 'vitest';
import { studioMenuSections } from '../studioNavMenus';

/** Echo translator: a row's label is its key, so the test pins the keys. */
const t = (key: string) => `t:${key}`;
const EVERY_ROLE = ['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER', 'CLUB_ADMIN'];

describe('studioMenuSections', () => {
  it('is empty in User mode and once the studio role is revoked', () => {
    expect(studioMenuSections('USER', EVERY_ROLE, true, t)).toEqual([]);
    expect(studioMenuSections('HOST', ['VENUE_OWNER'], true, t)).toEqual([]);
  });

  it('draws the Host studio as Dashboard, Pods, Requests, Withdrawal sections', () => {
    const sections = studioMenuSections('HOST', ['HOST'], true, t);
    expect(sections.map((section) => section.title)).toEqual([
      't:mweb.studioNav.dashboardGroup',
      't:mweb.studioNav.podsGroup',
      't:mweb.studioNav.requestsGroup',
      't:mweb.studioNav.withdrawalGroup',
    ]);
    expect(sections.flatMap((section) => section.items.map((item) => item.to))).toEqual([
      '/host/dashboard',
      '/host/manage',
      '/host/auto-pods',
      '/host/pod-requests',
      '/change-requests',
      '/host/nearby-venues',
      '/host/wallet',
    ]);
  });

  it('translates each row and gives it a drawer icon and no caption', () => {
    const [dashboard] = studioMenuSections('VENUE', ['VENUE_OWNER'], false, t);
    expect(dashboard.items).toEqual([
      { key: 'venue-dashboard', label: 't:mweb.studioNav.dashboard', caption: '', icon: 'dashboard', to: '/venues/manage' },
    ]);
    const requests = studioMenuSections('VENUE', ['VENUE_OWNER'], false, t).find(
      (section) => section.key === 'requests',
    );
    expect(requests?.items.map((item) => item.icon)).toEqual(['requests', 'change', 'nearby']);
  });

  it('keeps the venue calendar and settings rows, and drops Auto Pods with the flag', () => {
    const venue = studioMenuSections('VENUE', ['VENUE_OWNER'], false, t);
    const labels = venue.flatMap((section) => section.items.map((item) => item.label));
    expect(labels).toContain('t:mweb.venueMenu.availability');
    expect(labels).toContain('t:mweb.venueMenu.settings');
    expect(venue.flatMap((s) => s.items.map((i) => i.to))).not.toContain('/venues/auto-pods');
  });
});
