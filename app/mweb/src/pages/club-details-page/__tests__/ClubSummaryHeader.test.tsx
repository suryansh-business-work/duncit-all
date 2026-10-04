import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClubSummaryHeader from '../ClubSummaryHeader';

const baseProps = {
  club: { club_name: 'Badminton Buddies', club_description: 'We smash shuttles', club_moments: [{ id: 'm1' }, { id: 'm2' }] },
  featureUrl: 'http://x/club.jpg',
  podCount: 5,
  venueCount: 3,
  followersCount: 42,
  categoryCrumbs: ['Sports', 'Racquet', 'Badminton'] as const,
  following: false,
  chatUrl: 'http://chat/room',
  onToggleFollow: vi.fn(),
};

describe('ClubSummaryHeader', () => {
  it('renders name, description and crumbs, with no follower/pod/moment/venue counts', () => {
    render(<ClubSummaryHeader {...baseProps} />);
    expect(screen.getByText('Badminton Buddies')).toBeInTheDocument();
    expect(screen.getByText('We smash shuttles')).toBeInTheDocument();
    expect(screen.getByText('Badminton')).toBeInTheDocument();
    // The count stats were removed on purpose (a new club read "0 total
    // members" as its loudest line) — none render even when counts are passed.
    expect(screen.queryByText('42')).not.toBeInTheDocument(); // followers
    expect(screen.queryByText('5')).not.toBeInTheDocument(); // pods
    expect(screen.queryByText('2')).not.toBeInTheDocument(); // moments length
    expect(screen.queryByText('3')).not.toBeInTheDocument(); // venues
  });

  it('shows Follow Club and fires onToggleFollow when not following', () => {
    const onToggleFollow = vi.fn();
    render(<ClubSummaryHeader {...baseProps} following={false} onToggleFollow={onToggleFollow} />);
    const btn = screen.getByRole('button', { name: /Follow Club/i });
    fireEvent.click(btn);
    expect(onToggleFollow).toHaveBeenCalledTimes(1);
  });

  it('shows Following state when following is true', () => {
    render(<ClubSummaryHeader {...baseProps} following />);
    expect(screen.getByRole('button', { name: /Following/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Follow Club/i })).not.toBeInTheDocument();
  });

  it('renders Chat as an anchor with href when chatUrl is provided', () => {
    render(<ClubSummaryHeader {...baseProps} chatUrl="http://chat/room" />);
    const chat = screen.getByRole('link', { name: /Chat/i });
    expect(chat).toHaveAttribute('href', 'http://chat/room');
    expect(chat).toHaveAttribute('target', '_blank');
    expect(chat).toHaveAttribute('rel', 'noreferrer');
  });

  it('renders Chat as a disabled button when chatUrl is missing', () => {
    render(<ClubSummaryHeader {...baseProps} chatUrl={null} />);
    const chat = screen.getByRole('button', { name: /Chat/i });
    expect(chat).toBeDisabled();
    expect(chat).not.toHaveAttribute('href');
  });

  it('omits crumbs and description when absent', () => {
    render(
      <ClubSummaryHeader
        {...baseProps}
        club={{ club_name: 'Bare Club' }}
        categoryCrumbs={[]}
      />,
    );
    expect(screen.getByText('Bare Club')).toBeInTheDocument();
    expect(screen.queryByText('We smash shuttles')).not.toBeInTheDocument();
    expect(screen.queryByText('Badminton')).not.toBeInTheDocument();
    // A bare club shows no zero-count stat line.
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
