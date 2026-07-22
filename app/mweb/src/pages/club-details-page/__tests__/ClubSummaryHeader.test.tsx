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
  it('renders name, description, crumbs and all stats', () => {
    render(<ClubSummaryHeader {...baseProps} />);
    expect(screen.getByText('Badminton Buddies')).toBeInTheDocument();
    expect(screen.getByText('We smash shuttles')).toBeInTheDocument();
    expect(screen.getByText('Badminton')).toBeInTheDocument();
    // stats
    expect(screen.getByText('42')).toBeInTheDocument(); // followers
    expect(screen.getByText('5')).toBeInTheDocument(); // pods
    expect(screen.getByText('2')).toBeInTheDocument(); // moments length
    expect(screen.getByText('3')).toBeInTheDocument(); // venues
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

  it('omits crumbs and description when absent, and defaults moments to 0', () => {
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
    // moments stat falls back to 0
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
