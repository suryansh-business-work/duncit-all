import { describe, expect, it } from 'vitest';
import { STUDIO_NAV, studioNavFor, type StudioNavGroup } from '../src/studio-nav';

const ALL_ROLES = ['HOST', 'VENUE_OWNER', 'CLUB_ADMIN', 'ECOMM_MANAGER'];
const groupKeys = (groups: readonly StudioNavGroup[]) => groups.map((group) => group.key);
const paths = (groups: readonly StudioNavGroup[]) => groups.flatMap((g) => g.items.map((i) => i.path));
const routes = (groups: readonly StudioNavGroup[]) => groups.flatMap((g) => g.items.map((i) => i.route));

describe('STUDIO_NAV', () => {
  it('reads Dashboard first and Withdrawal last in every studio', () => {
    for (const groups of Object.values(STUDIO_NAV)) {
      expect(groups[0].key).toBe('dashboard');
      expect(groups.at(-1)?.key).toBe('withdrawal');
      expect(groups.at(-1)?.items).toEqual([
        expect.objectContaining({ path: '/host/wallet', route: 'Wallet' }),
      ]);
    }
  });

  it('gives the pod studios Pods and Requests, and the venue owner Venues', () => {
    expect(groupKeys(STUDIO_NAV.HOST)).toEqual(['dashboard', 'pods', 'requests', 'withdrawal']);
    expect(groupKeys(STUDIO_NAV.VENUE)).toEqual(['dashboard', 'venues', 'pods', 'requests', 'withdrawal']);
    expect(groupKeys(STUDIO_NAV.CLUB)).toEqual(['dashboard', 'pods', 'requests', 'withdrawal']);
    expect(groupKeys(STUDIO_NAV.ECOMM)).toEqual(['dashboard', 'withdrawal']);
  });

  it('keeps every option the old Host menu and Host Studio had', () => {
    expect(paths(STUDIO_NAV.HOST)).toEqual([
      '/host/dashboard',
      '/host/manage',
      '/host/auto-pods',
      '/host/pod-requests',
      '/change-requests',
      '/host/nearby-venues',
      '/host/wallet',
    ]);
  });

  it('keeps every option the old Venue menu and Venue Studio had', () => {
    expect(paths(STUDIO_NAV.VENUE)).toEqual([
      '/venues/manage',
      '/venues/availability',
      '/venues/settings',
      '/venues/earnings',
      '/venues/slot-requests',
      '/venues/auto-pods',
      '/venues/pod-requests',
      '/change-requests',
      '/venues/nearby-hosts',
      '/host/wallet',
    ]);
  });

  it('keeps every option the old Club Admin menu had', () => {
    expect(paths(STUDIO_NAV.CLUB)).toEqual([
      '/clubs/dashboard',
      '/clubs/manage',
      '/clubs/auto-pods',
      '/clubs/monitoring',
      '/change-requests',
      '/host/wallet',
    ]);
  });

  it('opens each pod-request inbox on its own side in the native app', () => {
    const host = STUDIO_NAV.HOST.flatMap((g) => g.items).find((i) => i.key === 'host-pod-requests');
    const venue = STUDIO_NAV.VENUE.flatMap((g) => g.items).find((i) => i.key === 'venue-pod-requests');
    expect(host).toMatchObject({ path: '/host/pod-requests', route: 'HostPodRequests' });
    expect(venue).toMatchObject({ path: '/venues/pod-requests', route: 'VenuePodRequests' });
  });

  it('gives every row an mWeb path, a native route and a translation key', () => {
    for (const groups of Object.values(STUDIO_NAV)) {
      for (const item of groups.flatMap((g) => g.items)) {
        expect(item.path.startsWith('/')).toBe(true);
        expect(item.route).toMatch(/^[A-Z]\w+$/);
        expect(item.labelKey).toMatch(/^mweb\./);
      }
    }
  });
});

describe('studioNavFor', () => {
  it('shows nothing in User mode', () => {
    expect(studioNavFor('USER', ALL_ROLES, { autoPods: true })).toEqual([]);
  });

  it('shows nothing once the studio role is revoked', () => {
    expect(studioNavFor('VENUE', ['HOST'], { autoPods: true })).toEqual([]);
    expect(studioNavFor('HOST', [], { autoPods: true })).toEqual([]);
  });

  it('shows the switched-in studio for somebody who holds it', () => {
    const host = studioNavFor('HOST', ['HOST'], { autoPods: true });
    expect(routes(host)).toContain('HostManage');
    expect(routes(host)).toContain('HostAutoPods');
    expect(routes(host)).not.toContain('VenueManage');
  });

  it('drops the Auto Pods rows while the flag is off, keeping their groups', () => {
    for (const mode of ['HOST', 'VENUE', 'CLUB'] as const) {
      const off = studioNavFor(mode, ALL_ROLES, { autoPods: false });
      expect(paths(off).some((path) => path.endsWith('/auto-pods'))).toBe(false);
      expect(groupKeys(off)).toEqual(groupKeys(STUDIO_NAV[mode]));
    }
  });
});
