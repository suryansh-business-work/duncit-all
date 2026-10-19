import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { QUICK_ACCESS_STORAGE_KEY } from '@duncit/utils';

import { SidebarUserContent } from '@/components/Sidebar/SidebarUserContent';
import { getItem, setItem } from '@/services/secure-storage';
import { useQuickAccessStore } from '@/stores/quick-access.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBranding', () => ({
  useBranding: () => ({ data: { branding: { venues_card_video_url: 'https://cdn/v.mp4' } } }),
}));
let mockAds: unknown[] = [];
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: mockAds, loading: false }),
}));
jest.mock('@/services/secure-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

const mockGet = getItem as jest.Mock;
const mockSet = setItem as jest.Mock;

beforeEach(() => {
  mockAds = [];
  mockGet.mockReset().mockResolvedValue(null);
  mockSet.mockReset().mockResolvedValue(undefined);
  useQuickAccessStore.setState({ raw: null });
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

type Props = Partial<Parameters<typeof SidebarUserContent>[0]>;

function renderContent(props: Props = {}) {
  const onNavigate = jest.fn();
  renderWithProviders(
    <SidebarUserContent
      me={null}
      account={null}
      roles={[]}
      mode="USER"
      flags={{}}
      onNavigate={onNavigate}
      {...props}
    />,
  );
  return onNavigate;
}

/** The grid's tile keys, in the order they are drawn. */
const gridOrder = () =>
  within(screen.getByTestId('sidebar-quick-grid'))
    .getAllByTestId(/^sidebar-grid-(?!badge)/)
    .map((tile) => String(tile.props.testID).replace('sidebar-grid-', ''));

describe('SidebarUserContent — profile card', () => {
  it('shows the identity and the completion nudge in one card, each opening its own page', () => {
    const onNavigate = renderContent({
      me: {
        first_name: 'Asha',
        full_name: 'Asha Roy',
        email: 'a@x.com',
        profile_photo: 'https://x/p.png',
      },
      account: { first_name: 'Asha' },
    });
    const card = screen.getByTestId('sidebar-profile-card');
    expect(within(card).getByText('Asha Roy')).toBeOnTheScreen();
    expect(within(card).getByText('a@x.com')).toBeOnTheScreen();
    // 1 of the 10 completion fields is filled.
    expect(within(card).getByText('Your profile is 10% complete')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-completion-bar')).toHaveAccessibilityValue({
      min: 0,
      max: 100,
      now: 10,
    });
    expect(within(card).getByText('Complete')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('sidebar-identity'));
    expect(onNavigate).toHaveBeenLastCalledWith('Profile');
    fireEvent.press(screen.getByTestId('profile-completion-cta'));
    expect(onNavigate).toHaveBeenLastCalledWith('Account');
  });

  it('drops the nudge at 100%, and while the completion record is still loading', () => {
    renderContent({ me: { full_name: 'Bob Roy' }, account: FULL_ACCOUNT });
    expect(screen.getByText('B')).toBeOnTheScreen();
    expect(screen.queryByTestId('profile-completion')).toBeNull();

    renderContent({ me: { full_name: 'Bob Roy' }, account: {}, accountLoading: true });
    expect(screen.queryByTestId('profile-completion')).toBeNull();
  });

  it('falls back to placeholders with no user and no account (0% complete)', () => {
    renderContent();
    expect(screen.getByText('U')).toBeOnTheScreen();
    expect(screen.getByText('User')).toBeOnTheScreen();
    expect(screen.getByText('Your profile is 0% complete')).toBeOnTheScreen();
  });
});

describe('SidebarUserContent — Quick Access', () => {
  it('draws the six default tiles under the Quick Access header, each opening its screen', () => {
    const onNavigate = renderContent();
    expect(screen.getByText('Quick Access')).toBeOnTheScreen();
    expect(gridOrder()).toEqual(['chats', 'following', 'pod-history', 'earn', 'ideas', 'support']);
    fireEvent.press(screen.getByTestId('sidebar-grid-chats'));
    expect(onNavigate).toHaveBeenLastCalledWith('Chats');
    fireEvent.press(screen.getByTestId('sidebar-grid-support'));
    expect(onNavigate).toHaveBeenLastCalledWith('Support');
    expect(screen.getByLabelText('Help & Support')).toBeOnTheScreen();
  });

  it('shows a count on a tile only when one is supplied and above zero', () => {
    renderContent({ badgeCounts: { chats: 12, following: 0 } });
    const badges = screen.getAllByTestId('sidebar-grid-badge');
    expect(badges).toHaveLength(1);
    expect(within(screen.getByTestId('sidebar-grid-chats')).getByText('9+')).toBeOnTheScreen();
    expect(screen.getByHintText('12 unread')).toBeOnTheScreen();
  });

  it('restores the grid the device kept', async () => {
    const kept = JSON.stringify(['faqs', 'saved', 'chats', 'gigs', 'badges', 'referral']);
    // The store reads the device once per launch; either way the kept pick is what it holds.
    mockGet.mockResolvedValue(kept);
    useQuickAccessStore.setState({ raw: kept });
    renderContent();
    await waitFor(() =>
      expect(gridOrder()).toEqual(['faqs', 'saved', 'chats', 'gigs', 'badges', 'referral']),
    );
  });

  it('edits the grid: unpick, refuse to save five, pick, reorder, then save to the device', async () => {
    renderContent();
    fireEvent.press(screen.getByTestId('sidebar-quick-edit'));
    expect(screen.getByTestId('quick-access-editor')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-access-count')).toHaveTextContent('6 of 6 picked');
    // Full: an unpicked destination cannot be added yet.
    expect(screen.getByTestId('quick-access-option-saved')).toBeDisabled();

    fireEvent.press(screen.getByTestId('quick-access-option-earn'));
    expect(screen.getByTestId('quick-access-count')).toHaveTextContent('5 of 6 picked');
    fireEvent.press(screen.getByTestId('quick-access-save'));
    expect(await screen.findByTestId('quick-access-error')).toHaveTextContent(
      'Pick exactly 6 shortcuts to save.',
    );
    expect(mockSet).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('quick-access-option-saved'));
    // Saved landed last; move it up one, ahead of Help & Support.
    fireEvent.press(screen.getByTestId('quick-access-up-saved'));
    fireEvent.press(screen.getByTestId('quick-access-save'));

    const expected = ['chats', 'following', 'pod-history', 'ideas', 'saved', 'support'];
    await waitFor(() =>
      expect(mockSet).toHaveBeenCalledWith(QUICK_ACCESS_STORAGE_KEY, JSON.stringify(expected)),
    );
    await waitFor(() => expect(screen.queryByTestId('quick-access-editor')).toBeNull());
    expect(gridOrder()).toEqual(expected);
  });

  it('keeps the edit on screen with the reason when the device will not keep it', async () => {
    mockSet.mockRejectedValue(new Error('keychain locked'));
    renderContent();
    fireEvent.press(screen.getByTestId('sidebar-quick-edit'));
    fireEvent.press(screen.getByTestId('quick-access-reset'));
    fireEvent.press(screen.getByTestId('quick-access-option-earn'));
    fireEvent.press(screen.getByTestId('quick-access-option-faqs'));
    fireEvent.press(screen.getByTestId('quick-access-save'));
    expect(await screen.findByTestId('quick-access-save-failed')).toBeOnTheScreen();
    // The new grid still shows for this session.
    expect(gridOrder()).toContain('faqs');
    expect(gridOrder()).not.toContain('earn');
  });

  it('offers a flag-gated destination in the editor only while its flag is on', () => {
    renderContent({ flags: { products: false } });
    fireEvent.press(screen.getByTestId('sidebar-quick-edit'));
    expect(screen.queryByTestId('quick-access-option-cart')).toBeNull();
  });
});

describe('SidebarUserContent — cards', () => {
  it('shows the sponsored card when a SIDEBAR ad is live', () => {
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
    renderContent();
    expect(screen.getByTestId('ad-slot-SIDEBAR')).toBeOnTheScreen();
    expect(screen.getByText('Sponsored Venue')).toBeOnTheScreen();
  });

  it('keeps the Duncit Coin card to User mode, and the Studio card to partners', () => {
    renderContent();
    expect(screen.getByTestId('sidebar-duncit-coin')).toBeOnTheScreen();
    expect(screen.queryByTestId('sidebar-studio-options')).toBeNull();

    renderContent({ roles: ['HOST'], mode: 'HOST' });
    expect(screen.getAllByTestId('sidebar-duncit-coin')).toHaveLength(1);
    expect(screen.getByTestId('sidebar-studio-options')).toBeOnTheScreen();
  });
});
