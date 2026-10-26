import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import LeaderboardList from '../LeaderboardList';
import { fallbackT } from '../../../i18n/fallback';
import type { LeaderboardEntry } from '../queries';

const entry = (rank: number, over: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  rank,
  user_id: `u${rank}`,
  name: `Name${rank}`,
  avatar_url: '',
  points: rank * 10,
  is_me: false,
  ...over,
});

describe('LeaderboardList', () => {
  it('shows the empty state for an empty board', () => {
    render(<LeaderboardList rows={[]} />);
    expect(screen.getByTestId('leaderboard-empty')).toHaveTextContent(fallbackT('mweb.leaderboard.emptyBoard'));
    expect(screen.queryByTestId('leaderboard-list')).not.toBeInTheDocument();
  });

  it('puts gold in the middle of the podium and the rest in plain rows', () => {
    render(<LeaderboardList rows={[entry(1), entry(2), entry(3), entry(4, { is_me: true }), entry(5)]} />);
    const spots = screen.getByTestId('leaderboard-podium').children;
    expect(Array.from(spots).map((el) => el.getAttribute('data-testid'))).toEqual([
      'leaderboard-podium-spot-u2',
      'leaderboard-podium-spot-u1',
      'leaderboard-podium-spot-u3',
    ]);
    expect(screen.getByTestId('leaderboard-row-4')).toHaveTextContent('Name4');
    expect(screen.getByTestId('leaderboard-row-5')).toHaveTextContent('50');
    expect(screen.queryByTestId('leaderboard-row-1')).not.toBeInTheDocument();
  });

  it('draws only the spots that exist and no divider list without extra rows', () => {
    render(<LeaderboardList rows={[entry(1, { name: '' })]} />);
    expect(screen.getAllByTestId(/leaderboard-podium-spot-/)).toHaveLength(1);
    expect(screen.getByText(fallbackT('mweb.leaderboard.anonymous'))).toBeInTheDocument();
    expect(screen.queryByTestId(/leaderboard-row-/)).not.toBeInTheDocument();
  });

  it('falls back to the anonymous label and a "?" avatar for a nameless row', () => {
    render(<LeaderboardList rows={[entry(1), entry(4, { name: '' })]} />);
    expect(screen.getByTestId('leaderboard-row-4')).toHaveTextContent(fallbackT('mweb.leaderboard.anonymous'));
    expect(screen.getByTestId('leaderboard-row-4')).toHaveTextContent('?');
  });
});
