import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import UserModeContent from '../UserModeContent';
import { PUBLIC_FEATURE_FLAGS } from '@duncit/app-settings';
import { ACTIVE_ADS } from '../../../ads/useActiveAds';
import type { StudioMode } from '../../../../studio-mode';

const mockBranding = vi.fn();
vi.mock('../../../../hooks/useBrandingAssets', () => ({
  useBrandingAssets: () => mockBranding(),
}));

const adsMock = {
  request: { query: ACTIVE_ADS, variables: { position: 'SIDEBAR' } },
  result: { data: { activeAds: [] } },
};

/** The Shop group lives behind the product system flag. */
const flagsMock = (enabled: boolean) => ({
  request: { query: PUBLIC_FEATURE_FLAGS },
  result: { data: { publicFeatureFlags: [{ key: 'is_product_visible', enabled }] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

function renderContent(props: {
  me: any;
  roles?: string[];
  mode?: StudioMode;
  showPodPlans: boolean;
  onNavigate: (to: string) => void;
  showProducts?: boolean;
}) {
  return render(
    <MockedProvider mocks={[adsMock, flagsMock(props.showProducts !== false)]}>
      <UserModeContent
        me={props.me}
        roles={props.roles ?? []}
        mode={props.mode ?? 'USER'}
        showPodPlans={props.showPodPlans}
        onNavigate={props.onNavigate}
      />
    </MockedProvider>,
  );
}

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

describe('UserModeContent', () => {
  beforeEach(() => {
    mockBranding.mockReset();
    mockBranding.mockReturnValue({ venuesCardVideoUrl: '' });
  });

  it('renders identity, quick actions, venues, referral and manage list', async () => {
    renderContent({ me: FULL_ME, showPodPlans: false, onNavigate: vi.fn() });
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pod History')).toBeInTheDocument();
    expect(screen.getByText('Venues')).toBeInTheDocument();
    expect(screen.getByText('Refer & Earn')).toBeInTheDocument();
    expect(screen.getByText('FAQs')).toBeInTheDocument();
    // Shop section — the e-commerce group parallel to Manage Account. It waits
    // on the flag query, so it lands a tick after the rest of the drawer.
    expect(await screen.findByText('Pod Shop')).toBeInTheDocument();
    expect(screen.getByText('Address Book')).toBeInTheDocument();
    expect(screen.getByText('Cart')).toBeInTheDocument();
  });

  it('drops the whole Shop group when products are switched off', async () => {
    renderContent({ me: FULL_ME, showPodPlans: false, onNavigate: vi.fn(), showProducts: false });
    // The rest of the drawer is unaffected — only the e-commerce group goes.
    expect(await screen.findByText('Refer & Earn')).toBeInTheDocument();
    expect(screen.queryByText('Pod Shop')).toBeNull();
    expect(screen.queryByText('Cart')).toBeNull();
    expect(screen.queryByText('My Product Order History')).toBeNull();
  });

  it('shows the incomplete banner when profile completion < 100%', () => {
    renderContent({ me: {}, showPodPlans: false, onNavigate: vi.fn() });
    expect(screen.getByText('Your profile is incomplete')).toBeInTheDocument();
    expect(screen.getByText('0% complete')).toBeInTheDocument();
  });

  it('hides the incomplete banner when the profile is fully complete', () => {
    renderContent({ me: FULL_ME, showPodPlans: false, onNavigate: vi.fn() });
    expect(screen.queryByText('Your profile is incomplete')).not.toBeInTheDocument();
  });

  it('handles a null me without crashing (defaults to empty completion)', () => {
    renderContent({ me: null, showPodPlans: false, onNavigate: vi.fn() });
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('0% complete')).toBeInTheDocument();
  });

  it('shows the Pod Plans row only when showPodPlans is true', () => {
    const { rerender } = renderContent({ me: FULL_ME, showPodPlans: false, onNavigate: vi.fn() });
    expect(screen.queryByText('Pod Plans')).not.toBeInTheDocument();

    rerender(
      <MockedProvider mocks={[adsMock]}>
        <UserModeContent me={FULL_ME} roles={[]} mode="USER" showPodPlans onNavigate={vi.fn()} />
      </MockedProvider>,
    );
    expect(screen.getByText('Pod Plans')).toBeInTheDocument();
  });

  it('reveals the Host Menu only once switched into Host Studio', () => {
    const onNavigate = vi.fn();
    // A host still in User mode gets the plain consumer drawer.
    const { rerender } = renderContent({
      me: FULL_ME,
      roles: ['HOST'],
      showPodPlans: false,
      onNavigate,
    });
    expect(screen.queryByText('Host Studio')).not.toBeInTheDocument();
    expect(screen.queryByText('Withdrawal')).not.toBeInTheDocument();

    rerender(
      <MockedProvider mocks={[adsMock]}>
        <UserModeContent me={FULL_ME} roles={['HOST']} mode="HOST" showPodPlans={false} onNavigate={onNavigate} />
      </MockedProvider>,
    );
    expect(screen.getByText('Host Menu')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Withdrawal'));
    expect(onNavigate).toHaveBeenCalledWith('/host/wallet');
  });

  it('navigates to /profile when the identity row is clicked', () => {
    const onNavigate = vi.fn();
    renderContent({ me: FULL_ME, showPodPlans: false, onNavigate });
    fireEvent.click(screen.getByRole('button', { name: 'Open your profile' }));
    expect(onNavigate).toHaveBeenCalledWith('/profile');
  });

  it('navigates to /account when the Complete button is clicked', () => {
    const onNavigate = vi.fn();
    renderContent({ me: {}, showPodPlans: false, onNavigate });
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(onNavigate).toHaveBeenCalledWith('/account');
  });

  it('navigates from quick action, venues, referral and manage rows', async () => {
    const onNavigate = vi.fn();
    renderContent({ me: FULL_ME, showPodPlans: false, onNavigate });
    await screen.findByText('Pod Shop');

    fireEvent.click(screen.getByRole('button', { name: 'Pod History' }));
    expect(onNavigate).toHaveBeenCalledWith('/pod-history');

    fireEvent.click(screen.getByRole('button', { name: 'Explore venues' }));
    expect(onNavigate).toHaveBeenCalledWith('/venues');

    fireEvent.click(screen.getByRole('button', { name: 'Refer & Earn' }));
    expect(onNavigate).toHaveBeenCalledWith('/referral');

    fireEvent.click(screen.getByText('Pod Shop'));
    expect(onNavigate).toHaveBeenCalledWith('/shop');

    fireEvent.click(screen.getByText('Address Book'));
    expect(onNavigate).toHaveBeenCalledWith('/address-book');
  });
});
