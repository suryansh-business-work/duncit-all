import { buildVenueMenuItems } from '@/components/Sidebar/venueMenuItems';

const t = (key: string) => `t:${key}`;

describe('buildVenueMenuItems', () => {
  it('adds nothing outside Venue mode', () => {
    expect(buildVenueMenuItems('USER', t)).toEqual([]);
    expect(buildVenueMenuItems('HOST', t)).toEqual([]);
  });

  it('lists availability, settings and Search Nearby Hosts in Venue mode', () => {
    const items = buildVenueMenuItems('VENUE', t);
    expect(items.map((item) => [item.key, item.route, item.label])).toEqual([
      ['venue-availability', 'VenueAvailability', 't:mweb.venueMenu.availability'],
      ['venue-settings', 'VenueSettings', 't:mweb.venueMenu.settings'],
      ['venue-nearby-hosts', 'NearbyHosts', 't:podRequests.searchHostsTitle'],
    ]);
    expect(items[2]?.icon).toBe('person-search');
  });
});
