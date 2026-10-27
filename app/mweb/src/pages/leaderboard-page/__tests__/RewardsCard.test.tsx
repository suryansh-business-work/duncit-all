import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import RewardsCard from '../RewardsCard';
import { fallbackT } from '../../../i18n/fallback';
import type { LeaderboardConfigData, LeaderboardReward } from '../queries';

const reward = (over: Partial<LeaderboardReward>): LeaderboardReward => ({
  category: 'POD_HOSTING',
  period: 'MONTHLY',
  rank_from: 1,
  rank_to: 1,
  title: 'Gold hamper',
  description: '',
  ...over,
});

const card = (rewards: LeaderboardReward[], category = 'POD_HOSTING') =>
  render(<RewardsCard config={{ rewards } as unknown as LeaderboardConfigData} category={category as never} />);

describe('RewardsCard', () => {
  it('says there are no prizes when none match the category', () => {
    card([reward({ category: 'OTHER' })]);
    expect(screen.getByTestId('leaderboard-rewards-empty')).toHaveTextContent(fallbackT('mweb.leaderboard.rewardsEmpty'));
    expect(screen.queryByTestId('leaderboard-rewards-monthly')).not.toBeInTheDocument();
  });

  it('lists monthly and yearly groups with a single-rank and a range label', () => {
    card([
      reward({ description: 'Top host' }),
      reward({ rank_from: 2, rank_to: 5, title: 'Voucher' }),
      reward({ period: 'YEARLY', title: 'Trip' }),
    ]);
    expect(screen.getByTestId('leaderboard-rewards-monthly')).toHaveTextContent('Gold hamper');
    expect(screen.getByTestId('leaderboard-rewards-monthly')).toHaveTextContent('Top host');
    expect(screen.getByTestId('leaderboard-reward-MONTHLY-1-1')).toHaveTextContent(
      fallbackT('mweb.leaderboard.rewardRankOne', { vars: { from: 1 } })
    );
    expect(screen.getByTestId('leaderboard-reward-MONTHLY-2-5')).toHaveTextContent(
      fallbackT('mweb.leaderboard.rewardRankRange', { vars: { from: 2, to: 5 } })
    );
    expect(screen.getByTestId('leaderboard-rewards-yearly')).toHaveTextContent('Trip');
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('shows only the yearly group, without a divider, when there are no monthly prizes', () => {
    card([reward({ period: 'YEARLY', title: 'Trip' })]);
    expect(screen.queryByTestId('leaderboard-rewards-monthly')).not.toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-rewards-yearly')).toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
});
