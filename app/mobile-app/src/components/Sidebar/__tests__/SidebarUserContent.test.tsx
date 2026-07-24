import { fireEvent, screen } from '@testing-library/react-native';

import { SidebarUserContent } from '@/components/Sidebar/SidebarUserContent';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBranding', () => ({
  useBranding: () => ({ data: { branding: { venues_card_video_url: 'https://cdn/v.mp4' } } }),
}));
let mockAds: unknown[] = [];
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: mockAds, loading: false }),
}));
beforeEach(() => {
  mockAds = [];
});

const FULL_ACCOUNT = {
  first_name: 'Asha',
  last_name: 'Roy',
  bio: 'Hi',
  dob: '2000-01-01',
  city: 'Mumbai',
  state: 'MH',
  country: 'IN',
  phone_number: '9990001111',
  whatsapp_number: '9990001111',
  profile_photo: 'https://x/p.png',
};

describe('SidebarUserContent', () => {
  it('renders the identity, incomplete banner and cards, and routes every tap', () => {
    const onNavigate = jest.fn();
    renderWithProviders(
      <SidebarUserContent
        me={{
          first_name: 'Asha',
          full_name: 'Asha Roy',
          email: 'a@x.com',
          profile_photo: 'https://x/p.png',
        }}
        account={{ first_name: 'Asha' }}
        roles={[]}
        showPodPlans={false}
        onNavigate={onNavigate}
      />,
    );

    // Identity (photo + name + email) opens the profile.
    expect(screen.getByText('Asha Roy')).toBeOnTheScreen();
    expect(screen.getByText('a@x.com')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sidebar-identity'));
    expect(onNavigate).toHaveBeenCalledWith('Profile');

    // Incomplete nudge: 1 of 10 fields filled → 10%.
    expect(screen.getByTestId('profile-completion')).toBeOnTheScreen();
    expect(screen.getByText('10% complete')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('profile-completion-cta'));
    expect(onNavigate).toHaveBeenCalledWith('Account');

    // Quick grid (Pod History / Earn) + venues card + referral card.
    fireEvent.press(screen.getByTestId('sidebar-grid-pod-history'));
    expect(onNavigate).toHaveBeenCalledWith('PodHistory');
    fireEvent.press(screen.getByTestId('sidebar-venues'));
    expect(onNavigate).toHaveBeenCalledWith('Venues');
    fireEvent.press(screen.getByTestId('sidebar-grid-earn'));
    expect(onNavigate).toHaveBeenCalledWith('Earn');
    fireEvent.press(screen.getByTestId('sidebar-referral'));
    expect(onNavigate).toHaveBeenCalledWith('Referral');

    // Manage list — Saved/Verification live here now; no Pod Plans when off.
    expect(screen.queryByTestId('sidebar-item-Pod Plans')).toBeNull();
    fireEvent.press(screen.getByTestId('sidebar-item-Saved Items'));
    expect(onNavigate).toHaveBeenCalledWith('Saved');

    // Shop section — the e-commerce group parallel to Manage Account.
    fireEvent.press(screen.getByTestId('sidebar-item-Pod Shop'));
    expect(onNavigate).toHaveBeenCalledWith('Shop');
    fireEvent.press(screen.getByTestId('sidebar-item-Address Book'));
    expect(onNavigate).toHaveBeenCalledWith('AddressBook');
    fireEvent.press(screen.getByTestId('sidebar-item-Cart'));
    expect(onNavigate).toHaveBeenCalledWith('Cart');

    // No Earnings/Withdrawal row for a pure consumer (no partner roles).
    expect(screen.queryByTestId('sidebar-item-Withdrawal')).toBeNull();
  });

  it('shows an Earnings > Withdrawal row for partner roles and routes to the wallet', () => {
    const onNavigate = jest.fn();
    renderWithProviders(
      <SidebarUserContent
        me={{ full_name: 'Host Roy' }}
        account={FULL_ACCOUNT}
        roles={['HOST']}
        showPodPlans={false}
        onNavigate={onNavigate}
      />,
    );
    fireEvent.press(screen.getByTestId('sidebar-item-Withdrawal'));
    expect(onNavigate).toHaveBeenCalledWith('Wallet');
  });

  it('hides the banner at 100% and shows Pod Plans when the flag is on', () => {
    const onNavigate = jest.fn();
    renderWithProviders(
      <SidebarUserContent
        me={{ full_name: 'Bob Roy' }}
        account={FULL_ACCOUNT}
        roles={[]}
        showPodPlans
        onNavigate={onNavigate}
      />,
    );
    // No photo/email → placeholder initial + name only.
    expect(screen.getByText('B')).toBeOnTheScreen();
    expect(screen.getByText('Bob Roy')).toBeOnTheScreen();
    expect(screen.queryByTestId('profile-completion')).toBeNull();
    fireEvent.press(screen.getByTestId('sidebar-item-Pod Plans'));
    expect(onNavigate).toHaveBeenCalledWith('PodPlans');
  });

  it('shows the SIDEBAR sponsored card under the venues card when an ad is live', () => {
    mockAds = [
      {
        id: 'ad1',
        ad_type: 'IMAGE',
        media_url: 'https://cdn/ad.jpg',
        redirect_url: null,
        ad_title: 'Sponsored Venue',
        position: 'SIDEBAR',
      },
    ];
    renderWithProviders(
      <SidebarUserContent
        me={null}
        account={null}
        roles={[]}
        showPodPlans={false}
        onNavigate={jest.fn()}
      />,
    );
    expect(screen.getByTestId('ad-slot-SIDEBAR')).toBeOnTheScreen();
    expect(screen.getByText('Sponsored Venue')).toBeOnTheScreen();
  });

  it('falls back to placeholders with no user and no account (0% complete)', () => {
    renderWithProviders(
      <SidebarUserContent
        me={null}
        account={null}
        roles={[]}
        showPodPlans={false}
        onNavigate={jest.fn()}
      />,
    );
    expect(screen.getByText('U')).toBeOnTheScreen();
    expect(screen.getByText('User')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-completion')).toBeOnTheScreen();
    expect(screen.getByText('0% complete')).toBeOnTheScreen();
  });
});
