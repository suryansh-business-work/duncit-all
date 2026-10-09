import { fireEvent, screen } from '@testing-library/react-native';

import { SidebarUserContent } from '@/components/Sidebar/SidebarUserContent';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBranding', () => ({
  useBranding: () => ({ data: { branding: { venues_card_video_url: 'https://cdn/v.mp4' } } }),
}));
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: [], loading: false }),
}));

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

/** The switched-in studio's ONE highlighted sidebar entry (Studio Options). */
describe('SidebarUserContent — studio Options entry', () => {
  it('shows ONE studio Options entry only once switched into a studio', () => {
    const onNavigate = jest.fn();
    // A host still in User mode gets the plain consumer sidebar.
    const { rerender } = renderWithProviders(
      <SidebarUserContent
        me={{ full_name: 'Host Roy' }}
        account={FULL_ACCOUNT}
        roles={['HOST']}
        mode="USER"
        showPodPlans={false}
        onNavigate={onNavigate}
      />,
    );
    expect(screen.queryByTestId('sidebar-studio-options')).toBeNull();

    rerender(
      <SidebarUserContent
        me={{ full_name: 'Host Roy' }}
        account={FULL_ACCOUNT}
        roles={['HOST']}
        mode="HOST"
        showPodPlans={false}
        onNavigate={onNavigate}
      />,
    );
    // The studio's options are no longer listed in the sidebar — one entry,
    // with its title and hint, opens the Host Options page.
    const entry = screen.getByTestId('sidebar-studio-options');
    expect(entry).toHaveTextContent(/Host Options/);
    expect(screen.queryByTestId('sidebar-item-Your Pods')).toBeNull();
    expect(screen.queryByTestId('sidebar-item-Withdrawal')).toBeNull();
    fireEvent.press(entry);
    expect(onNavigate).toHaveBeenCalledWith('HostOptions');
  });

  it('opens the Venue Options page from Venue Studio, and drops it once the role is revoked', () => {
    const onNavigate = jest.fn();
    const { rerender } = renderWithProviders(
      <SidebarUserContent
        me={{ full_name: 'Owner' }}
        account={FULL_ACCOUNT}
        roles={['VENUE_OWNER']}
        mode="VENUE"
        showPodPlans={false}
        onNavigate={onNavigate}
      />,
    );
    expect(screen.getByTestId('sidebar-studio-options')).toHaveTextContent(/Venue Options/);
    fireEvent.press(screen.getByTestId('sidebar-studio-options'));
    expect(onNavigate).toHaveBeenCalledWith('VenueOptions');

    rerender(
      <SidebarUserContent
        me={{ full_name: 'Owner' }}
        account={FULL_ACCOUNT}
        roles={[]}
        mode="VENUE"
        showPodPlans={false}
        onNavigate={onNavigate}
      />,
    );
    expect(screen.queryByTestId('sidebar-studio-options')).toBeNull();
  });
});
