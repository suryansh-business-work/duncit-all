import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import UserModeContent from '../UserModeContent';
import { ACTIVE_ADS } from '../../../ads/useActiveAds';

const mockBranding = vi.fn();
vi.mock('../../../../hooks/useBrandingAssets', () => ({
  useBrandingAssets: () => mockBranding(),
}));

const adsMock = {
  request: { query: ACTIVE_ADS, variables: { position: 'SIDEBAR' } },
  result: { data: { activeAds: [] } },
};

function renderContent(props: {
  me: any;
  showPodPlans: boolean;
  onNavigate: (to: string) => void;
}) {
  return render(
    <MockedProvider mocks={[adsMock]}>
      <UserModeContent {...props} />
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

  it('renders identity, quick actions, venues, referral and manage list', () => {
    renderContent({ me: FULL_ME, showPodPlans: false, onNavigate: vi.fn() });
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pod History')).toBeInTheDocument();
    expect(screen.getByText('Venues')).toBeInTheDocument();
    expect(screen.getByText('Refer & Earn')).toBeInTheDocument();
    expect(screen.getByText('Pod Shop')).toBeInTheDocument();
    expect(screen.getByText('FAQs')).toBeInTheDocument();
    // Shop section — the e-commerce group parallel to Manage Account.
    expect(screen.getByText('Address Book')).toBeInTheDocument();
    expect(screen.getByText('Cart')).toBeInTheDocument();
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
        <UserModeContent me={FULL_ME} showPodPlans onNavigate={vi.fn()} />
      </MockedProvider>,
    );
    expect(screen.getByText('Pod Plans')).toBeInTheDocument();
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

  it('navigates from quick action, venues, referral and manage rows', () => {
    const onNavigate = vi.fn();
    renderContent({ me: FULL_ME, showPodPlans: false, onNavigate });

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
