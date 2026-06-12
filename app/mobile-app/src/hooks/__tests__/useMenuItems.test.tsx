import { renderHook } from '@testing-library/react-native';

import { useMenuItems } from '@/hooks/useMenuItems';
import type { StudioMode } from '@/utils/studio-mode';

const menu = (mode?: StudioMode) => renderHook(() => useMenuItems(mode)).result.current.items;
const routes = (mode?: StudioMode) => menu(mode).map((i) => i.route);

describe('useMenuItems', () => {
  it('returns the USER menu without Home/Profile (logo + summary card cover those)', () => {
    const labels = menu('USER').map((i) => i.label);
    expect(labels).toContain('Earn with Duncit');
    expect(labels).not.toContain('Home');
    expect(labels).not.toContain('Profile');
    expect(routes('USER')).toEqual([
      'Saved',
      'PodHistory',
      'Earn',
      'Referral',
      'Support',
      'PodIdeas',
      'Faqs',
    ]);
  });

  it('returns the Host studio menu', () => {
    expect(routes('HOST')).toEqual(['HostManage', 'HostManage', 'Support', 'BecomeHost', 'Faqs']);
  });

  it('returns the Venue studio menu', () => {
    expect(routes('VENUE')).toEqual([
      'VenueManage',
      'VenueManage',
      'Support',
      'RegisterVenue',
      'Faqs',
    ]);
  });

  it('returns the ecomm studio menu', () => {
    expect(routes('ECOMM')).toEqual([
      'ProductsManage',
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
