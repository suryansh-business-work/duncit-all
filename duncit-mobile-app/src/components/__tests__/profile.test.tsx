import { fireEvent, screen } from '@testing-library/react-native';

import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfilePanels } from '@/components/profile/ProfilePanels';
import { ProfilePostsGrid } from '@/components/profile/ProfilePostsGrid';
import { renderWithProviders } from '@/utils/test-utils';

const me = {
  user_id: 'u',
  first_name: 'Sam',
  last_name: 'Lee',
  full_name: 'Sam Lee',
  email: 's@x.com',
  is_email_verified: true,
  profile_photo: null,
  bio: 'hi there',
  roles: ['HOST'],
  profile_links: [{ label: 'Site', url: 'https://x.com' }],
  followers_count: 3,
  following_count: 5,
  pet_profile: {
    name: 'Rex',
    species: 'Dog',
    breed: 'Lab',
    age: 2,
    photo_url: null,
    bio: 'good boy',
  },
};

describe('ProfileHeader', () => {
  it('renders identity, email and stats', () => {
    renderWithProviders(<ProfileHeader me={me as never} />);
    expect(screen.getByText('Sam Lee')).toBeOnTheScreen();
    expect(screen.getByText('s@x.com')).toBeOnTheScreen();
    expect(screen.getByText('hi there')).toBeOnTheScreen();
  });

  it('renders with a photo, unverified email and no roles/bio', () => {
    const m2 = {
      ...me,
      profile_photo: 'http://x/p.jpg',
      is_email_verified: false,
      roles: [],
      bio: null,
    } as never;
    renderWithProviders(<ProfileHeader me={m2} />);
    expect(screen.getByText('Sam Lee')).toBeOnTheScreen();
  });

  it('falls back to a default initial and dash email', () => {
    const m2 = { ...me, first_name: null, full_name: null, email: null } as never;
    renderWithProviders(<ProfileHeader me={m2} />);
    expect(screen.getByText('U')).toBeOnTheScreen();
    expect(screen.getByText('—')).toBeOnTheScreen();
  });
});

describe('ProfilePanels', () => {
  it('renders accordions + host/venue rows', () => {
    const onOpenHost = jest.fn();
    const onOpenVenue = jest.fn();
    renderWithProviders(
      <ProfilePanels me={me as never} onOpenHost={onOpenHost} onOpenVenue={onOpenVenue} />,
    );
    expect(screen.getByTestId('accordion-links')).toBeOnTheScreen();
    expect(screen.getByTestId('accordion-pet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('accordion-links-header')); // expand → render links
    fireEvent.press(screen.getByTestId('accordion-pet-header')); // expand → render pet details
    fireEvent.press(screen.getByTestId('accordion-links-header')); // collapse again
    fireEvent.press(screen.getByTestId('profile-host'));
    expect(onOpenHost).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('profile-venue'));
    expect(onOpenVenue).toHaveBeenCalled();
  });

  it('renders with no links/pet and the become-host/venue labels', () => {
    const m2 = { ...me, profile_links: [], pet_profile: null, roles: [] } as never;
    renderWithProviders(<ProfilePanels me={m2} onOpenHost={jest.fn()} onOpenVenue={jest.fn()} />);
    expect(screen.queryByTestId('accordion-links')).toBeNull();
    expect(screen.getByText('Become a host')).toBeOnTheScreen();
    expect(screen.getByText('Become a venue owner')).toBeOnTheScreen();
  });
});

describe('ProfilePostsGrid', () => {
  it('opens a post viewer, and shows the empty state', () => {
    const { rerender } = renderWithProviders(
      <ProfilePostsGrid
        posts={
          [
            {
              id: 'p1',
              image_url: 'http://x/i.jpg',
              caption: 'hi',
              likes_count: 0,
              comments_count: 0,
              created_at: '',
            },
          ] as never
        }
      />,
    );
    fireEvent.press(screen.getByTestId('post-p1'));
    expect(screen.getByTestId('post-viewer-image')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('post-viewer-close'));

    rerender(<ProfilePostsGrid posts={[] as never} />);
    expect(screen.getByTestId('profile-no-posts')).toBeOnTheScreen();
  });

  it('shows the add-post action and fires it (header + empty state)', () => {
    const onAddPost = jest.fn();
    const { rerender } = renderWithProviders(
      <ProfilePostsGrid posts={[] as never} onAddPost={onAddPost} />,
    );
    fireEvent.press(screen.getByTestId('profile-add-post'));
    fireEvent.press(screen.getByTestId('profile-add-post-empty'));
    expect(onAddPost).toHaveBeenCalledTimes(2);

    rerender(<ProfilePostsGrid posts={[] as never} onAddPost={onAddPost} uploading />);
    expect(screen.getByText('Uploading…')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('profile-add-post'));
    expect(onAddPost).toHaveBeenCalledTimes(2); // disabled while uploading
  });
});
