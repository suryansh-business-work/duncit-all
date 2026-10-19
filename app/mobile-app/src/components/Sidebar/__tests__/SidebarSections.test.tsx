import { fireEvent, screen, within } from '@testing-library/react-native';
import type { ProfileMenuFlags } from '@duncit/utils';

import { SidebarSections, type SidebarSectionsProps } from '@/components/Sidebar/SidebarSections';
import { renderWithProviders } from '@/utils/test-utils';

const ALL_ON: ProfileMenuFlags = {
  pod_plans_section: true,
  leaderboard: true,
  membership: true,
  gift_cards: true,
  tour_guide: true,
  products: true,
};

function renderSections(props: Partial<SidebarSectionsProps> = {}) {
  const handlers = {
    onNavigate: jest.fn(),
    onSwitch: jest.fn(),
    onToggleTheme: jest.fn(),
    onSelectPolicy: jest.fn(),
  };
  renderWithProviders(
    <SidebarSections
      flags={{}}
      canSwitch={false}
      modeLabel="User"
      dark={false}
      policies={[{ id: '1', slug: 'terms', title: 'Terms' }]}
      policiesLoading={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

const toggle = (id: string) => screen.getByTestId(`sidebar-section-${id}-toggle`);
const subtitle = (id: string) => screen.getByTestId(`sidebar-section-${id}-subtitle`);

describe('SidebarSections', () => {
  it('draws the five cards collapsed, titled, each naming what is inside', () => {
    renderSections();
    expect(screen.getByText('Explore & Community')).toBeOnTheScreen();
    expect(screen.getByText('Work & Earnings')).toBeOnTheScreen();
    expect(screen.getByText('Shopping & Orders')).toBeOnTheScreen();
    expect(screen.getByText('Account & Preferences')).toBeOnTheScreen();
    expect(screen.getByText('Support & Legal')).toBeOnTheScreen();
    for (const id of ['explore', 'work', 'shopping', 'account', 'support']) {
      expect(toggle(id)).toBeCollapsed();
    }
    // Flags off: a subtitle lists only the rows that are there.
    expect(subtitle('explore')).toHaveTextContent('Pod Ideas, Badges');
    expect(subtitle('work')).toHaveTextContent('Gig Jobs, Refer & Earn');
    expect(subtitle('shopping')).toHaveTextContent('Food, My Rented Items');
    expect(subtitle('support')).toHaveTextContent('Help, FAQs, Policies');
    expect(screen.queryByTestId('sidebar-item-ideas')).toBeNull();
  });

  it('opens a card on press, showing its rows, and closes it again', () => {
    const { onNavigate } = renderSections();
    fireEvent.press(toggle('shopping'));
    expect(toggle('shopping')).toBeExpanded();
    fireEvent.press(screen.getByTestId('sidebar-item-food-orders'));
    expect(onNavigate).toHaveBeenCalledWith('MyFoodOrders');
    fireEvent.press(screen.getByTestId('sidebar-item-rentals'));
    expect(onNavigate).toHaveBeenCalledWith('MyRentedItems');
    // Products off: no Pod Shop, cart, orders or address book.
    expect(screen.queryByTestId('sidebar-item-shop')).toBeNull();
    expect(screen.queryByTestId('sidebar-item-addresses')).toBeNull();

    fireEvent.press(toggle('shopping'));
    expect(toggle('shopping')).toBeCollapsed();
    expect(screen.queryByTestId('sidebar-item-food-orders')).toBeNull();
  });

  it('adds every flag-gated row once its flag is on', () => {
    const { onNavigate } = renderSections({ flags: ALL_ON });
    expect(subtitle('explore')).toHaveTextContent('Pod Ideas, Leaderboard, Badges');
    expect(subtitle('work')).toHaveTextContent('Gig Jobs, Refer & Earn, Membership');
    expect(subtitle('shopping')).toHaveTextContent(
      'Pod Shop, Cart, Food, Gift Cards, My Product Order History, Address Book, My Rented Items',
    );
    expect(subtitle('account')).toHaveTextContent(
      'Manage Account, Saved Items, Contacts, Verification, Tour Guide, Pod Plans, Dark mode',
    );

    fireEvent.press(toggle('explore'));
    fireEvent.press(screen.getByTestId('sidebar-item-leaderboard'));
    expect(onNavigate).toHaveBeenLastCalledWith('Leaderboard');

    fireEvent.press(toggle('work'));
    expect(
      within(screen.getByTestId('sidebar-section-work')).getByText('Coming soon'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sidebar-item-membership'));
    expect(onNavigate).toHaveBeenLastCalledWith('Membership');

    fireEvent.press(toggle('shopping'));
    fireEvent.press(screen.getByTestId('sidebar-item-gift-cards-buy'));
    expect(onNavigate).toHaveBeenLastCalledWith('GiftCards');
    fireEvent.press(screen.getByTestId('sidebar-item-gift-cards-redeem'));
    expect(onNavigate).toHaveBeenLastCalledWith('GiftCardRedeem');

    fireEvent.press(toggle('account'));
    fireEvent.press(screen.getByTestId('sidebar-item-tour'));
    expect(onNavigate).toHaveBeenLastCalledWith('TourGuide');
  });

  it('keeps Switch role and Dark mode in Account', () => {
    const { onSwitch, onToggleTheme } = renderSections({
      canSwitch: true,
      modeLabel: 'Host Studio',
    });
    expect(subtitle('account')).toHaveTextContent(/Switch role, Dark mode$/);
    fireEvent.press(toggle('account'));
    expect(screen.getByText('Host Studio')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sidebar-switch-role'));
    expect(onSwitch).toHaveBeenCalledTimes(1);
    fireEvent(screen.getByTestId('sidebar-theme-switch'), 'valueChange', true);
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('lists the policies under Support & Legal, and leaves them out when there are none', () => {
    const { onSelectPolicy, onNavigate } = renderSections();
    fireEvent.press(toggle('support'));
    fireEvent.press(screen.getByTestId('sidebar-item-faqs'));
    expect(onNavigate).toHaveBeenLastCalledWith('Faqs');
    fireEvent.press(screen.getByTestId('sidebar-policies-toggle'));
    fireEvent.press(screen.getByTestId('sidebar-policy-terms'));
    expect(onSelectPolicy).toHaveBeenCalledWith('terms');
  });

  it('drops Policies from the Support subtitle when no policy is published', () => {
    renderSections({ policies: [] });
    expect(subtitle('support')).toHaveTextContent(/^Help, FAQs$/);
    fireEvent.press(toggle('support'));
    expect(screen.queryByTestId('sidebar-policies')).toBeNull();
  });
});
