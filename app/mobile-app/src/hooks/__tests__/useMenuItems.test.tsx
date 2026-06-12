import { renderHook } from '@testing-library/react-native';

import { useMenuItems } from '@/hooks/useMenuItems';
import type { StudioMode } from '@/utils/studio-mode';

const menu = (mode?: StudioMode) => renderHook(() => useMenuItems(mode)).result.current.items;
const routes = (mode?: StudioMode) => menu(mode).map((i) => i.route);

describe('useMenuItems', () => {
  it('returns the full USER menu with Earn with Duncit (no host/venue CTAs)', () => {
    const labels = menu('USER').map((i) => i.label);
    expect(labels).toContain('Earn with Duncit');
    expect(labels).not.toContain('Be a host');
    expect(routes('USER')).toEqual([
      'Home',
      'Profile',
      'Saved',
      'PodHistory',
      'Earn',
      'Support',
      'PodIdeas',
      'Faqs',
    ]);
  });

  it('returns the Host studio menu', () => {
    expect(routes('HOST')).toEqual(['Profile', 'HostManage', 'Support', 'BecomeHost', 'Faqs']);
  });

  it('returns the Venue studio menu', () => {
    expect(routes('VENUE')).toEqual(['Profile', 'VenueManage', 'Support', 'RegisterVenue', 'Faqs']);
  });

  it('returns the ecomm studio menu', () => {
    expect(routes('ECOMM')).toEqual([
      'Profile',
      'ProductsManage',
      'Support',
      'ListProduct',
      'Faqs',
    ]);
  });

  it('defaults to the USER menu', () => {
    expect(routes()).toContain('Earn');
  });
});
