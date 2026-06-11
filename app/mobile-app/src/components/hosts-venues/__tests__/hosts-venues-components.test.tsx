import { fireEvent, screen } from '@testing-library/react-native';

import { HostCard, VenueCard, venueLocation } from '@/components/hosts-venues';
import { renderWithProviders } from '@/utils/test-utils';
import type { PublicHost, PublicVenue } from '@/hooks/useHostsVenues';

const host = (over: Record<string, unknown> = {}): PublicHost =>
  ({
    id: 'a',
    user_id: 'h1',
    full_name: 'Host One',
    email: 'h@x.com',
    passport_photo_url: null,
    full_address: '12 Main St, Pune',
    tags: ['Music', 'Food'],
    approved_at: '2026-06-01',
    ...over,
  }) as unknown as PublicHost;

const venue = (over: Record<string, unknown> = {}): PublicVenue =>
  ({
    id: 'v1',
    owner_user_id: 'o1',
    venue_name: 'Sunset Cafe',
    venue_type: 'CAFE',
    capacity: 40,
    description: 'Cosy',
    cover_image_url: null,
    gallery: [],
    locality: 'Kothrud',
    city: 'Pune',
    state: 'MH',
    tags: [],
    amenities: [],
    ...over,
  }) as unknown as PublicVenue;

describe('venueLocation', () => {
  it('joins locality/city/state, skipping blanks', () => {
    expect(venueLocation(venue())).toBe('Kothrud · Pune · MH');
    expect(venueLocation(venue({ locality: null, state: null }))).toBe('Pune');
  });
});

describe('HostCard', () => {
  it('opens the host and toggles follow (not me)', () => {
    const onOpen = jest.fn();
    const onToggleFollow = jest.fn();
    renderWithProviders(
      <HostCard
        host={host()}
        isMe={false}
        isFollowing={false}
        pending={false}
        onOpen={onOpen}
        onToggleFollow={onToggleFollow}
      />,
    );
    expect(screen.getByText('Host One')).toBeOnTheScreen();
    expect(screen.getByText('Follow')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('host-follow-h1'));
    expect(onToggleFollow).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('host-card-h1'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('shows Following + a photo, and hides the button for me', () => {
    const { rerender } = renderWithProviders(
      <HostCard
        host={host({ passport_photo_url: 'http://i' })}
        isMe={false}
        isFollowing
        pending={false}
        onOpen={jest.fn()}
        onToggleFollow={jest.fn()}
      />,
    );
    expect(screen.getByText('Following')).toBeOnTheScreen();

    rerender(
      <HostCard
        host={host()}
        isMe
        isFollowing={false}
        pending={false}
        onOpen={jest.fn()}
        onToggleFollow={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('host-follow-h1')).toBeNull();
  });

  it('does not toggle while a follow is pending', () => {
    const onToggleFollow = jest.fn();
    renderWithProviders(
      <HostCard
        host={host()}
        isMe={false}
        isFollowing={false}
        pending
        onOpen={jest.fn()}
        onToggleFollow={onToggleFollow}
      />,
    );
    fireEvent.press(screen.getByTestId('host-follow-h1'));
    expect(onToggleFollow).not.toHaveBeenCalled();
  });
});

describe('VenueCard', () => {
  it('renders details and opens the venue', () => {
    const onOpen = jest.fn();
    renderWithProviders(<VenueCard venue={venue()} onOpen={onOpen} />);
    expect(screen.getByText('Sunset Cafe')).toBeOnTheScreen();
    expect(screen.getByText('CAFE · 40 capacity')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('venue-card-v1'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('renders a cover image and tolerates missing location', () => {
    renderWithProviders(
      <VenueCard
        venue={venue({ cover_image_url: 'http://i', locality: null, city: null, state: null })}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByText('Sunset Cafe')).toBeOnTheScreen();
  });
});
