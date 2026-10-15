import { fireEvent, screen } from '@testing-library/react-native';

import { SidebarUserContent } from '@/components/Sidebar/SidebarUserContent';
import { buildSidebarTiles } from '@/components/Sidebar/sidebarTiles';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBranding', () => ({
  useBranding: () => ({ data: { branding: { venues_card_video_url: 'https://cdn/v.mp4' } } }),
}));
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: [], loading: false }),
}));

const FOOD_ORDERS = 'sidebar-item-Your Food Orders';

/*
  "Your Food Orders" — the orders a member placed from venue menus — has its
  own "Food" section in the account menu. Unlike Leaderboard, Membership and
  Gift Cards it rides on no feature flag, and it is not a partner tool, so it
  is there in every mode.
*/
describe('SidebarUserContent — Food section', () => {
  it('lists Your Food Orders under Food with every flag off, opening My Food Orders', () => {
    const onNavigate = jest.fn();
    renderWithProviders(
      <SidebarUserContent
        me={null}
        account={null}
        roles={[]}
        mode="USER"
        showPodPlans={false}
        onNavigate={onNavigate}
      />,
    );
    expect(screen.getByText('Food')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(FOOD_ORDERS));
    expect(onNavigate).toHaveBeenCalledWith('MyFoodOrders');
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('keeps the section for a partner in a studio mode too', () => {
    const onNavigate = jest.fn();
    renderWithProviders(
      <SidebarUserContent
        me={{ full_name: 'Host Roy' }}
        account={null}
        roles={['HOST']}
        mode="HOST"
        showPodPlans
        showLeaderboard
        showMembership
        showGiftCards
        showProducts
        onNavigate={onNavigate}
      />,
    );
    expect(screen.getAllByTestId(FOOD_ORDERS)).toHaveLength(1);
    fireEvent.press(screen.getByTestId(FOOD_ORDERS));
    expect(onNavigate).toHaveBeenCalledWith('MyFoodOrders');
  });
});

describe('buildSidebarTiles — food', () => {
  it('builds one translated food-orders row with its icon and route', () => {
    const t = jest.fn((key: string) => `[${key}]`);
    const { food } = buildSidebarTiles(t);
    expect(food).toEqual([
      {
        key: 'food-orders',
        label: '[mweb.venueFood.myOrders.sidebarLabel]',
        caption: '',
        icon: 'restaurant-menu',
        route: 'MyFoodOrders',
      },
    ]);
    expect(t).toHaveBeenCalledWith('mweb.venueFood.myOrders.sidebarLabel');
  });
});
