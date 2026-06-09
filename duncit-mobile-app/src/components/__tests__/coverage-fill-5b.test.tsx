import { screen, fireEvent } from '@testing-library/react-native';

import { HostCard } from '@/components/hosts-venues/HostCard';
import { ProfilePanels } from '@/components/profile/ProfilePanels';
import { VenueCard } from '@/components/hosts-venues/VenueCard';
import { renderWithProviders } from '@/utils/test-utils';

describe('HostCard pending + following', () => {
  it('tints the spinner for a following host', () => {
    renderWithProviders(
      <HostCard
        host={
          { user_id: 'h1', full_name: 'Asha', passport_photo_url: 'x', tags: ['Yoga'] } as never
        }
        isMe={false}
        isFollowing
        pending
        onOpen={jest.fn()}
        onToggleFollow={jest.fn()}
      />,
    );
    expect(screen.getByTestId('host-card-h1')).toBeOnTheScreen();
  });
});

describe('VenueCard without capacity', () => {
  it('omits the capacity label and the location row', () => {
    renderWithProviders(
      <VenueCard
        venue={
          {
            id: 'v1',
            venue_name: 'Hall',
            venue_type: 'BANQUET',
            capacity: null,
            cover_image_url: 'https://i/c.jpg',
            locality: null,
            city: null,
            state: null,
          } as never
        }
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByTestId('venue-card-v1')).toBeOnTheScreen();
  });
});

describe('ProfilePanels pet without age/bio', () => {
  it('renders a pet accordion missing the optional fields', () => {
    renderWithProviders(
      <ProfilePanels
        me={
          {
            roles: [],
            profile_links: [],
            pet_profile: { name: 'Rex', species: 'Dog', breed: null, age: null, bio: null },
          } as never
        }
        onOpenHost={jest.fn()}
        onOpenVenue={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('accordion-pet-header'));
    expect(screen.getByText('Rex')).toBeOnTheScreen();
  });
});
