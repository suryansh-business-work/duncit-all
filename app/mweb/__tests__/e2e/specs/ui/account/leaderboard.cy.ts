/// <reference types="cypress" />
import {
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_POINTS_FIELD,
  leaderboardMedal,
  type LeaderboardCategory,
  type LeaderboardPeriodKey,
} from '@duncit/utils';
import { signInRunMember } from '../../../support/access-steps';

/**
 * Leaderboard (UI), live on staging, read-only. Every board, window, point
 * value and reward is read from the same queries the page asks, so the
 * assertions follow the admin's configuration rather than a copy of it. The
 * run account has earned no points, so it is "Not ranked yet" everywhere.
 */

const BOARD = `query E2eUiLeaderboard($category: LeaderboardCategory!, $period: LeaderboardPeriod) {
  leaderboard(category: $category, period: $period) { my_points my_rank participants rows { rank user_id points } }
}`;
const CONFIG = `query E2eUiLeaderboardConfig {
  leaderboardConfig {
    points_per_join points_per_host points_per_club_pod points_per_venue_pod points_per_product_sale
    rewards { category period rank_from rank_to }
  }
}`;

interface Board {
  my_points: number;
  my_rank: number | null;
  participants: number;
  rows: Array<{ rank: number; user_id: string; points: number }>;
}

type PointsField = (typeof LEADERBOARD_POINTS_FIELD)[LeaderboardCategory];

type Config = Record<PointsField, number> & {
  rewards: Array<{ category: string; period: 'MONTHLY' | 'YEARLY'; rank_from: number; rank_to: number }>;
};

/** The last board in tab order — where LB-02 ends up before it walks the windows. */
const LAST_BOARD = LEADERBOARD_CATEGORIES[LEADERBOARD_CATEGORIES.length - 1];

const boardOf = (category: LeaderboardCategory, period: LeaderboardPeriodKey) =>
  cy.gql<{ leaderboard: Board }>(BOARD, { category, period }).then(({ leaderboard }) => leaderboard);

/** The board on screen is exactly the server's: podium for the medal ranks, a row for the rest. */
function expectBoard(board: Board): void {
  if (board.rows.length === 0) {
    cy.byTestId('leaderboard-empty').should('have.text', 'No points on this board yet — be the first!');
    return;
  }
  board.rows.forEach((row) => {
    if (leaderboardMedal(row.rank) === null) cy.byTestId(`leaderboard-row-${row.rank}`).should('contain.text', String(row.points));
    else cy.byTestId(`leaderboard-podium-spot-${row.user_id}`).should('exist');
  });
}

function expectNotRanked(board: Board): void {
  expect(board.my_rank, 'the run account has no rank').to.equal(null);
  cy.byTestId('leaderboard-your-points-value').should('have.text', String(board.my_points));
  cy.byTestId('leaderboard-your-points-rank').should('have.text', 'Not ranked yet');
  cy.byTestId('leaderboard-your-points').should('contain.text', 'Earn your first points to appear on this board.');
}

function openLeaderboard(): void {
  cy.interceptOperation('LeaderboardBoard');
  cy.visitApp('/leaderboard');
  cy.wait('@LeaderboardBoard');
  cy.byTestId('leaderboard-page-title').should('have.text', 'Leaderboard');
}

describe('Leaderboard', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  it('LB-01 the page opens on Users for This month, shows the server’s ranking, and the member is not ranked yet', () => {
    boardOf('USER', 'MONTH').then((board) => {
      openLeaderboard();
      cy.byTestId('leaderboard-tab-USER').should('have.attr', 'aria-selected', 'true');
      cy.byTestId('leaderboard-period-MONTH').should('have.attr', 'aria-pressed', 'true');
      expectNotRanked(board);
      expectBoard(board);
    });
  });

  it('LB-02 each board keeps its tab in the URL, and every window reloads the ranking', () => {
    openLeaderboard();
    LEADERBOARD_CATEGORIES.filter((category) => category !== 'USER').forEach((category) => {
      cy.byTestId(`leaderboard-tab-${category}`).click();
      cy.wait('@LeaderboardBoard').its('request.body.variables.category').should('eq', category);
      cy.location('search').should('contain', `selectedtab=${category}`);
      boardOf(category, 'MONTH').then((board) => {
        expectNotRanked(board);
        expectBoard(board);
      });
    });
    (['YEAR', 'ALL'] as const).forEach((period) => {
      cy.byTestId(`leaderboard-period-${period}`).click();
      cy.wait('@LeaderboardBoard').its('request.body.variables.period').should('eq', period);
      cy.byTestId(`leaderboard-period-${period}`).should('have.attr', 'aria-pressed', 'true');
      boardOf(LAST_BOARD, period).then(expectBoard);
    });
  });

  it('LB-03 How to increase your points and Rewards come from the admin configuration', () => {
    cy.gql<{ leaderboardConfig: Config }>(CONFIG).then(({ leaderboardConfig: config }) => {
      openLeaderboard();
      const active = LEADERBOARD_CATEGORIES.filter((category) => (config[LEADERBOARD_POINTS_FIELD[category]] ?? 0) > 0);
      if (active.length === 0) cy.byTestId('leaderboard-how-to-earn').should('not.exist');
      active.forEach((category) => {
        cy.byTestId(`leaderboard-how-to-earn-points-${category}`)
          .should('have.text', `+${config[LEADERBOARD_POINTS_FIELD[category]]} pts`);
      });
      const userRewards = config.rewards.filter((reward) => reward.category === 'USER');
      if (userRewards.length === 0) {
        cy.byTestId('leaderboard-rewards-empty').should('have.text', 'Rewards for this board will be announced soon.');
      }
      userRewards.forEach((reward) => {
        cy.byTestId(`leaderboard-reward-${reward.period}-${reward.rank_from}-${reward.rank_to}`).should(
          'contain.text',
          reward.rank_from === reward.rank_to ? `Rank #${reward.rank_from}` : `Ranks #${reward.rank_from}–#${reward.rank_to}`,
        );
      });
    });
  });
});
