import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { FollowStatus } from '@duncit/utils';

import VenueList from '../VenueList';

type Venue = Parameters<typeof VenueList>[0]['venues'][number];

const venue = (id: string, over: Partial<Venue> = {}): Venue => ({
  id,
  owner_user_id: `owner-${id}`,
  venue_name: `Venue ${id}`,
  ...over,
});

interface RenderOpts {
  meId?: string;
  pendingUserId?: string | null;
  statusFor?: (userId: string) => FollowStatus;
}

function renderList(venues: Venue[], opts: RenderOpts = {}) {
  const onToggleFollow = vi.fn();
  const statusFor = vi.fn(opts.statusFor ?? (() => 'NONE' as FollowStatus));
  render(
    <MemoryRouter>
      <VenueList
        venues={venues}
        meId={opts.meId}
        statusFor={statusFor}
        pendingUserId={opts.pendingUserId ?? null}
        onToggleFollow={onToggleFollow}
      />
    </MemoryRouter>,
  );
  return { onToggleFollow, statusFor };
}

describe('VenueList', () => {
  it('shows the empty state when there are no approved venues', () => {
    renderList([]);
    expect(screen.getByTestId('venues-empty-title')).toHaveTextContent('No approved venues yet.');
  });

  it('renders every detail a venue has', () => {
    renderList([
      venue('v1', {
        venue_type: 'Cafe',
        capacity: 40,
        description: 'A quiet corner for board games.',
        cover_image_url: 'https://img.example/v1.jpg',
        locality: 'Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postal_code: '560038',
        tags: ['cozy', 'wifi', 'pets', 'music', 'late'],
        amenities: ['Parking', 'AC', 'Projector', 'Restroom', 'Lockers'],
      }),
    ]);

    const card = screen.getByTestId('venue-card-v1');
    expect(within(card).getByRole('img', { name: 'Venue v1' })).toHaveAttribute('src', 'https://img.example/v1.jpg');
    expect(within(card).getByText('Venue v1')).toBeInTheDocument();
    expect(within(card).getByText('Cafe')).toBeInTheDocument();
    expect(within(card).getByText('Indiranagar, Bengaluru, Karnataka')).toBeInTheDocument();
    expect(within(card).getByText('40')).toBeInTheDocument();
    expect(within(card).getByText('A quiet corner for board games.')).toBeInTheDocument();
    expect(within(card).getByText('PIN: 560038')).toBeInTheDocument();

    // Four tags and four amenities at most.
    expect(within(card).getByText('music')).toBeInTheDocument();
    expect(within(card).queryByText('late')).not.toBeInTheDocument();
    expect(within(card).getByText('Restroom')).toBeInTheDocument();
    expect(within(card).queryByText('Lockers')).not.toBeInTheDocument();

    expect(within(card).getByTestId('venue-view-v1')).toHaveAttribute('href', '/venue/v1');
  });

  it('leaves out every optional detail a bare venue does not have', () => {
    renderList([venue('v2', { tags: [], amenities: [], capacity: null })]);

    const card = screen.getByTestId('venue-card-v2');
    expect(within(card).queryByRole('img')).not.toBeInTheDocument();
    expect(within(card).getByTestId('StorefrontOutlinedIcon')).toBeInTheDocument();
    expect(within(card).queryByTestId('LocationOnIcon')).not.toBeInTheDocument();
    expect(within(card).queryByTestId('PeopleIcon')).not.toBeInTheDocument();
    expect(within(card).queryByText(/PIN:/)).not.toBeInTheDocument();
    expect(card.querySelectorAll('.MuiChip-root')).toHaveLength(0);
  });

  it('shows the location from the state alone, and a zero capacity', () => {
    renderList([venue('v3', { state: 'Goa', capacity: 0 })]);
    const card = screen.getByTestId('venue-card-v3');
    expect(within(card).getByText('Goa')).toBeInTheDocument();
    expect(within(card).getByText('0')).toBeInTheDocument();
  });

  it('follows the venue’s owner, with the status read for that owner', () => {
    const { onToggleFollow, statusFor } = renderList([venue('v1'), venue('v2')], {
      statusFor: (id) => (id === 'owner-v2' ? 'FOLLOWING' : 'NONE'),
    });

    expect(statusFor).toHaveBeenCalledWith('owner-v1');
    expect(statusFor).toHaveBeenCalledWith('owner-v2');
    expect(within(screen.getByTestId('venue-card-v2')).getByTestId('follow-button')).toHaveTextContent('Following');

    fireEvent.click(within(screen.getByTestId('venue-card-v1')).getByTestId('follow-button'));
    expect(onToggleFollow).toHaveBeenCalledWith('owner-v1');
  });

  it('disables following your own venue and the one whose follow is in flight', () => {
    renderList([venue('mine', { owner_user_id: 'me' }), venue('busy'), venue('free')], {
      meId: 'me',
      pendingUserId: 'owner-busy',
    });
    expect(within(screen.getByTestId('venue-card-mine')).getByTestId('follow-button')).toBeDisabled();
    expect(within(screen.getByTestId('venue-card-busy')).getByTestId('follow-button')).toBeDisabled();
    expect(within(screen.getByTestId('venue-card-free')).getByTestId('follow-button')).toBeEnabled();
  });
});
