import { renderHook } from '@testing-library/react-native';

import { useMenuItems } from '@/hooks/useMenuItems';

describe('useMenuItems', () => {
  it('offers the join CTAs when the user has no host/venue role', () => {
    const { result } = renderHook(() => useMenuItems([]));
    expect(result.current.hostItem).toMatchObject({ label: 'Be a host', route: 'BecomeHost' });
    expect(result.current.venueItem).toMatchObject({
      label: 'Be a Venue Owner',
      route: 'RegisterVenue',
    });
    expect(result.current.baseItems.map((i) => i.route)).toEqual([
      'Home',
      'Profile',
      'Saved',
      'PodHistory',
    ]);
  });

  it('swaps to management entries for hosts and venue owners', () => {
    const { result } = renderHook(() => useMenuItems(['HOST', 'VENUE_OWNER']));
    expect(result.current.hostItem).toMatchObject({
      label: 'Hosts Management',
      route: 'HostManage',
    });
    expect(result.current.venueItem).toMatchObject({
      label: 'Venue Management',
      route: 'VenueManage',
    });
  });
});
