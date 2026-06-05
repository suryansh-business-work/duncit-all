import { fireEvent, screen } from '@testing-library/react-native';

import { PublicProfileBadges, PublicProfileHeader } from '@/components/public-profile';
import { renderWithProviders } from '@/utils/test-utils';
import type { PublicProfileUser, UserBadge } from '@/hooks/usePublicProfile';

const user = (over: Record<string, unknown> = {}): PublicProfileUser =>
  ({
    user_id: 'u1',
    full_name: 'Riya Sharma',
    first_name: 'Riya',
    last_name: 'Sharma',
    profile_photo: null,
    bio: 'Pod lover',
    city: 'Pune',
    zone: 'Kothrud',
    ...over,
  }) as unknown as PublicProfileUser;

const badge = (over: Record<string, unknown> = {}): UserBadge =>
  ({
    id: 'ub1',
    awarded_at: '2026-06-01T00:00:00Z',
    awarded_reason: 'Hosted 5 pods',
    badge: { id: 'b1', title: 'Star Host', description: 'Five pods', image_url: null },
    ...over,
  }) as unknown as UserBadge;

describe('PublicProfileHeader', () => {
  it('renders name, location and bio', () => {
    renderWithProviders(<PublicProfileHeader user={user()} />);
    expect(screen.getByText('Riya Sharma')).toBeOnTheScreen();
    expect(screen.getByText('Kothrud, Pune')).toBeOnTheScreen();
    expect(screen.getByText('Pod lover')).toBeOnTheScreen();
  });

  it('renders a photo and falls back when name/location/bio are empty', () => {
    renderWithProviders(
      <PublicProfileHeader
        user={user({
          profile_photo: 'http://i',
          full_name: null,
          city: null,
          zone: null,
          bio: null,
        })}
      />,
    );
    expect(screen.getByText('Duncit user')).toBeOnTheScreen();
  });
});

describe('PublicProfileBadges', () => {
  it('renders nothing when there are no badges', () => {
    renderWithProviders(<PublicProfileBadges badges={[]} />);
    expect(screen.queryByTestId('public-profile-badges')).toBeNull();
  });

  it('lists badges and opens/closes the details sheet', () => {
    renderWithProviders(<PublicProfileBadges badges={[badge()]} />);
    expect(screen.getByTestId('public-profile-badges')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('badge-ub1'));
    expect(screen.getByTestId('badge-sheet')).toBeOnTheScreen();
    expect(screen.getByText('Five pods')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('badge-sheet-close'));
  });

  it('renders a badge image, no-description/no-date badge, and closes via backdrop', () => {
    renderWithProviders(
      <PublicProfileBadges
        badges={[
          badge({
            id: 'ub2',
            awarded_at: null,
            badge: { id: 'b2', title: 'Pro', description: null, image_url: 'http://img' },
          }),
        ]}
      />,
    );
    fireEvent.press(screen.getByTestId('badge-ub2'));
    expect(screen.getByTestId('badge-sheet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('badge-sheet-backdrop'));
  });
});
