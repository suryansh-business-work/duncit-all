import { fireEvent, screen } from '@testing-library/react-native';

import { SidebarUserContent } from '@/components/Sidebar/SidebarUserContent';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBranding', () => ({
  useBranding: () => ({ data: { branding: { venues_card_video_url: 'https://cdn/v.mp4' } } }),
}));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
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

/** The ONE "Studio" sidebar entry a partner gets, whichever role is active. */
describe('SidebarUserContent — Studio entry', () => {
  it('gives a partner ONE "Studio" entry in any mode, opening the role in effect', () => {
    const onNavigate = jest.fn();
    // A host still in User mode already has the entry: it opens the Studio on
    // the first role they hold.
    const { rerender } = renderWithProviders(
      <SidebarUserContent
        me={{ full_name: 'Host Roy' }}
        account={FULL_ACCOUNT}
        roles={['HOST', 'VENUE_OWNER']}
        mode="USER"
        flags={{}}
        onNavigate={onNavigate}
      />,
    );
    expect(screen.getByTestId('sidebar-studio-options')).toHaveTextContent(/Studio/);
    fireEvent.press(screen.getByTestId('sidebar-studio-options'));
    expect(onNavigate).toHaveBeenLastCalledWith('HostOptions');

    rerender(
      <SidebarUserContent
        me={{ full_name: 'Host Roy' }}
        account={FULL_ACCOUNT}
        roles={['HOST', 'VENUE_OWNER']}
        mode="VENUE"
        flags={{}}
        onNavigate={onNavigate}
      />,
    );
    // Still one entry, no longer named after a role; the role's options are
    // not listed in the sidebar — they live on the Studio screen it opens.
    const entry = screen.getByTestId('sidebar-studio-options');
    expect(screen.getAllByTestId('sidebar-studio-options')).toHaveLength(1);
    expect(entry).toHaveTextContent(/Everything for your partner roles in one place/);
    expect(entry).not.toHaveTextContent(/Venue Options/);
    expect(screen.queryByTestId('sidebar-item-Your Pods')).toBeNull();
    expect(screen.queryByTestId('sidebar-item-Withdrawal')).toBeNull();
    fireEvent.press(entry);
    expect(onNavigate).toHaveBeenLastCalledWith('VenueOptions');
  });

  it('offers a brand manager the Studio only while products are switched on', () => {
    const onNavigate = jest.fn();
    const brand = (showProducts: boolean) => (
      <SidebarUserContent
        me={{ full_name: 'Brand' }}
        account={FULL_ACCOUNT}
        roles={['ECOMM_MANAGER']}
        mode="USER"
        flags={{ products: showProducts }}
        onNavigate={onNavigate}
      />
    );
    const { rerender } = renderWithProviders(brand(false));
    expect(screen.queryByTestId('sidebar-studio-options')).toBeNull();

    rerender(brand(true));
    fireEvent.press(screen.getByTestId('sidebar-studio-options'));
    expect(onNavigate).toHaveBeenCalledWith('BrandOptions');
  });

  it('falls back to a role still held, and drops the entry once every role is revoked', () => {
    const onNavigate = jest.fn();
    const { rerender } = renderWithProviders(
      <SidebarUserContent
        me={{ full_name: 'Owner' }}
        account={FULL_ACCOUNT}
        roles={['CLUB_ADMIN']}
        mode="VENUE"
        flags={{}}
        onNavigate={onNavigate}
      />,
    );
    fireEvent.press(screen.getByTestId('sidebar-studio-options'));
    expect(onNavigate).toHaveBeenCalledWith('ClubOptions');

    rerender(
      <SidebarUserContent
        me={{ full_name: 'Owner' }}
        account={FULL_ACCOUNT}
        roles={[]}
        mode="VENUE"
        flags={{}}
        onNavigate={onNavigate}
      />,
    );
    expect(screen.queryByTestId('sidebar-studio-options')).toBeNull();
  });
});
