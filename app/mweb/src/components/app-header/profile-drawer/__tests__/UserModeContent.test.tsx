import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { QUICK_ACCESS_STORAGE_KEY, type ProfileMenuFlags } from '@duncit/utils';
import UserModeContent from '../UserModeContent';
import { ACTIVE_ADS } from '../../../ads/useActiveAds';
import type { StudioMode } from '../../../../studio-mode';

const mockBranding = vi.fn();
vi.mock('../../../../hooks/useBrandingAssets', () => ({
  useBrandingAssets: () => mockBranding(),
}));

const adsMock = {
  request: { query: ACTIVE_ADS, variables: { position: 'SIDEBAR' } },
  result: { data: { activeAds: [] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

interface RenderProps {
  me?: any;
  roles?: string[];
  mode?: StudioMode;
  flags?: ProfileMenuFlags;
  badgeCounts?: Record<string, number>;
  onNavigate?: (to: string) => void;
}

function content(props: RenderProps) {
  return (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[adsMock]}>
      <UserModeContent
        me={props.me ?? null}
        roles={props.roles ?? []}
        mode={props.mode ?? 'USER'}
        flags={props.flags ?? {}}
        badgeCounts={props.badgeCounts}
        onNavigate={props.onNavigate ?? vi.fn()}
      />
    </MockedProvider>
  );
}

const renderContent = (props: RenderProps = {}) => render(content(props));

/** The grid's tile keys, in the order they are drawn. */
const gridOrder = () =>
  Array.from(screen.getByTestId('sidebar-quick-grid').querySelectorAll('[data-testid^="sidebar-grid-"]'))
    .map((tile) => tile.getAttribute('data-testid') ?? '')
    .filter((id) => id !== 'sidebar-grid-badge')
    .map((id) => id.replace('sidebar-grid-', ''));

const FULL_ME = {
  full_name: 'Jane Doe',
  first_name: 'Jane',
  email: 'jane@example.com',
  profile_photo: 'https://cdn.example.com/jane.jpg',
  bio: 'hi',
  dob: '1990-01-01',
  city: 'NYC',
  state: 'NY',
  country: 'US',
  last_name: 'Doe',
  phone_number: '123',
  whatsapp_number: '123',
};

describe('UserModeContent — profile card', () => {
  beforeEach(() => {
    mockBranding.mockReset();
    mockBranding.mockReturnValue({ venuesCardVideoUrl: '' });
    localStorage.clear();
  });

  it('draws the identity and the completion nudge in one card', () => {
    const onNavigate = vi.fn();
    renderContent({ me: { full_name: 'Jane Doe', email: 'jane@example.com', first_name: 'Jane' }, onNavigate });
    const card = screen.getByTestId('sidebar-profile-card');
    expect(within(card).getByText('Jane Doe')).toBeInTheDocument();
    expect(within(card).getByText('jane@example.com')).toBeInTheDocument();
    // 1 of the 10 completion fields is filled.
    expect(within(card).getByText('Your profile is 10% complete')).toBeInTheDocument();
    expect(within(card).getByRole('progressbar', { name: 'Your profile is 10% complete' })).toHaveAttribute('aria-valuenow', '10');

    fireEvent.click(screen.getByRole('button', { name: 'Open your profile' }));
    expect(onNavigate).toHaveBeenLastCalledWith('/profile');
    fireEvent.click(within(card).getByRole('button', { name: 'Complete your profile' }));
    expect(onNavigate).toHaveBeenLastCalledWith('/account');
  });

  it('drops the nudge once the profile is complete', () => {
    renderContent({ me: FULL_ME });
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-completion')).not.toBeInTheDocument();
  });

  it('handles a null me without crashing (0% complete)', () => {
    renderContent({ me: null });
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Your profile is 0% complete')).toBeInTheDocument();
  });
});

describe('UserModeContent — Quick Access', () => {
  beforeEach(() => {
    mockBranding.mockReturnValue({ venuesCardVideoUrl: '' });
    localStorage.clear();
  });

  it('draws the six default tiles under the Quick Access heading, each opening its page', () => {
    const onNavigate = vi.fn();
    renderContent({ onNavigate });
    expect(screen.getByRole('heading', { name: 'Quick Access' })).toBeInTheDocument();
    expect(gridOrder()).toEqual(['chats', 'following', 'pod-history', 'earn', 'ideas', 'support']);
    fireEvent.click(screen.getByRole('button', { name: 'Pod History' }));
    expect(onNavigate).toHaveBeenLastCalledWith('/pod-history');
    fireEvent.click(screen.getByTestId('sidebar-grid-following'));
    expect(onNavigate).toHaveBeenLastCalledWith('/follow');
    fireEvent.click(screen.getByRole('button', { name: 'Help & Support' }));
    expect(onNavigate).toHaveBeenLastCalledWith('/support');
  });

  it('shows a count only for a tile given one above zero, described in words', () => {
    renderContent({ badgeCounts: { chats: 3, following: 0 } });
    expect(screen.getAllByTestId('sidebar-grid-badge')).toHaveLength(1);
    expect(screen.getByTestId('sidebar-grid-badge')).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'Chats' })).toHaveAccessibleDescription('3 unread');
  });

  it('restores the grid this browser kept, and ignores a corrupt value', () => {
    localStorage.setItem(QUICK_ACCESS_STORAGE_KEY, JSON.stringify(['faqs', 'saved', 'chats', 'gigs', 'badges', 'referral']));
    const { unmount } = renderContent();
    expect(gridOrder()).toEqual(['faqs', 'saved', 'chats', 'gigs', 'badges', 'referral']);
    unmount();

    localStorage.setItem(QUICK_ACCESS_STORAGE_KEY, '{oops');
    renderContent();
    expect(gridOrder()).toEqual(['chats', 'following', 'pod-history', 'earn', 'ideas', 'support']);
  });

  it('edits the grid: unpick, refuse five, pick, reorder, then save to this browser', async () => {
    renderContent();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Quick Access' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Quick Access' });
    expect(within(dialog).getByTestId('quick-access-count')).toHaveTextContent('6 of 6 picked');
    // Full: an unpicked destination cannot be added yet.
    expect(within(dialog).getByTestId('quick-access-option-saved')).toBeDisabled();

    fireEvent.click(within(dialog).getByTestId('quick-access-option-earn'));
    expect(within(dialog).getByTestId('quick-access-count')).toHaveTextContent('5 of 6 picked');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByTestId('quick-access-error')).toHaveTextContent('Pick exactly 6 shortcuts to save.');
    expect(localStorage.getItem(QUICK_ACCESS_STORAGE_KEY)).toBeNull();

    fireEvent.click(within(dialog).getByTestId('quick-access-option-saved'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move Saved Items up' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    const expected = ['chats', 'following', 'pod-history', 'ideas', 'saved', 'support'];
    await waitFor(() => expect(localStorage.getItem(QUICK_ACCESS_STORAGE_KEY)).toBe(JSON.stringify(expected)));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(gridOrder()).toEqual(expected);
  });

  it('keeps the dialog open with the reason when the browser will not keep the pick', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    try {
      renderContent();
      fireEvent.click(screen.getByRole('button', { name: 'Edit Quick Access' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.click(within(dialog).getByTestId('quick-access-option-earn'));
      fireEvent.click(within(dialog).getByTestId('quick-access-option-faqs'));
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
      expect(await within(dialog).findByTestId('quick-access-save-failed')).toBeInTheDocument();
      // The new grid still holds for this visit.
      expect(gridOrder()).toContain('faqs');
      expect(gridOrder()).not.toContain('earn');
    } finally {
      setItem.mockRestore();
    }
  });

  it('offers a flag-gated destination in the editor only while its flag is on', async () => {
    const { unmount } = renderContent({ flags: { products: false } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Quick Access' }));
    await screen.findByRole('dialog');
    expect(screen.queryByTestId('quick-access-option-cart')).not.toBeInTheDocument();
    unmount();

    renderContent({ flags: { products: true } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Quick Access' }));
    expect(await screen.findByTestId('quick-access-option-cart')).toBeInTheDocument();
  });
});

describe('UserModeContent — Studio and Duncit Coin cards', () => {
  beforeEach(() => {
    mockBranding.mockReturnValue({ venuesCardVideoUrl: '' });
    localStorage.clear();
  });

  it('gives a partner ONE "Studio" entry in any mode, and a consumer none', () => {
    const onNavigate = vi.fn();
    const { rerender } = renderContent({ me: FULL_ME, onNavigate });
    expect(screen.queryByTestId('sidebar-studio-options')).not.toBeInTheDocument();

    // A host still in User mode already has the entry: it opens the Studio on
    // the first role they hold.
    rerender(content({ me: FULL_ME, roles: ['HOST'], onNavigate }));
    fireEvent.click(screen.getByRole('button', { name: 'Studio' }));
    expect(onNavigate).toHaveBeenLastCalledWith('/host/options');

    rerender(content({ me: FULL_ME, roles: ['HOST'], mode: 'HOST', onNavigate }));
    const entry = screen.getByRole('button', { name: 'Studio' });
    expect(entry).toHaveAccessibleDescription('Everything for your partner roles in one place');
    fireEvent.keyDown(entry, { key: 'Enter' });
    expect(onNavigate).toHaveBeenCalledTimes(2);
    // The coin card is a consumer reward — it stays out of a studio.
    expect(screen.queryByTestId('sidebar-duncit-coin')).not.toBeInTheDocument();
  });

  it('offers a brand manager the Studio only while products are on, and drops it once roles are gone', () => {
    const onNavigate = vi.fn();
    const { rerender } = renderContent({ me: FULL_ME, roles: ['ECOMM_MANAGER'], flags: { products: false }, onNavigate });
    expect(screen.queryByTestId('sidebar-studio-options')).not.toBeInTheDocument();
    rerender(content({ me: FULL_ME, roles: ['ECOMM_MANAGER'], flags: { products: true }, onNavigate }));
    fireEvent.click(screen.getByRole('button', { name: 'Studio' }));
    expect(onNavigate).toHaveBeenCalledWith('/products/options');
    rerender(content({ me: FULL_ME, roles: [], flags: { products: true }, onNavigate }));
    expect(screen.queryByTestId('sidebar-studio-options')).not.toBeInTheDocument();
  });

  it('shows the Duncit Coin card in User mode, opening the ledger', () => {
    const onNavigate = vi.fn();
    renderContent({ me: FULL_ME, onNavigate });
    fireEvent.click(screen.getByRole('button', { name: 'Duncit Coin' }));
    expect(onNavigate).toHaveBeenCalledWith('/duncit-coin');
  });
});
