import { renderHook } from '@testing-library/react-native';

import { useMenuItems } from '@/hooks/useMenuItems';
import type { StudioMode } from '@/utils/studio-mode';

// Products are gated behind `is_product_visible`; default it on so the ecomm
// studio shows its "Your Products" row. The off path has its own test.
const mockFeatureFlag = jest.fn().mockReturnValue(true);
jest.mock('@/hooks/useFeatureFlag', () => ({
  useFeatureFlag: (key: string, fallback?: boolean) => mockFeatureFlag(key, fallback),
}));

beforeEach(() => {
  mockFeatureFlag.mockReturnValue(true);
});

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
      'Verification',
      'Support',
      'PodIdeas',
      'Faqs',
    ]);
  });

  it('returns the Host studio menu with the Wallet row', () => {
    expect(routes('HOST')).toEqual([
      'HostDashboard',
      'HostManage',
      'Wallet',
      'Support',
      'Verification',
      'Faqs',
    ]);
  });

  it('returns the Venue studio menu', () => {
    expect(routes('VENUE')).toEqual([
      'VenueManage',
      'VenueManage',
      'Support',
      'Verification',
      'Faqs',
    ]);
  });

  it('returns the ecomm studio menu', () => {
    expect(routes('ECOMM')).toEqual([
      'ProductsManage',
      'ProductsManage',
      'Support',
      'Verification',
      'Faqs',
    ]);
  });

  it('drops the Your Products row from the ecomm menu when products are gated off', () => {
    mockFeatureFlag.mockReturnValue(false);
    const labels = menu('ECOMM').map((i) => i.label);
    expect(labels).not.toContain('Your Products');
    expect(routes('ECOMM')).toEqual(['ProductsManage', 'Support', 'Verification', 'Faqs']);
  });

  it('defaults to the USER menu', () => {
    expect(routes()).toContain('Earn');
  });
});
