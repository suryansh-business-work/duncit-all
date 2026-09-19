import type { MockedResponse } from '@apollo/client/testing';
import {
  ADMIN_LEADERBOARD_BOARD,
  ADMIN_UPDATE_LEADERBOARD_SETTINGS,
  type LeaderboardEntry,
  type LeaderboardReward,
  type LeaderboardSettings,
} from '../../src/pages/leaderboard/queries';

/**
 * Leaderboard mocks. The portal has no codegen for these documents, so the
 * shapes are the hand-written row interfaces from `leaderboard/queries.ts`;
 * everything that flows through `MockedProvider` carries `__typename`.
 */
export const makeLeaderboardEntry = (over: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  rank: 1,
  user_id: 'u1',
  name: 'Asha Rao',
  avatar_url: 'https://cdn.duncit.com/users/asha.jpg',
  points: 1250,
  is_me: false,
  ...over,
});

export const leaderboardBoardMock = (
  rows: LeaderboardEntry[],
  { category = 'USER', period = 'MONTH' } = {},
): MockedResponse => ({
  request: { query: ADMIN_LEADERBOARD_BOARD, variables: { category, period } },
  result: {
    data: {
      leaderboard: {
        __typename: 'LeaderboardBoard',
        category,
        period,
        rows: rows.map((row) => ({ __typename: 'LeaderboardEntry', ...row })),
        my_points: 0,
        my_rank: null,
        participants: rows.length,
      },
    },
  },
});

export const makeLeaderboardReward = (
  over: Partial<LeaderboardReward> = {},
): LeaderboardReward => ({
  category: 'USER',
  period: 'MONTHLY',
  rank_from: 1,
  rank_to: 3,
  title: 'Free pod pass',
  description: 'One free pod next month',
  is_active: true,
  sort_order: 0,
  ...over,
});

export const makeLeaderboardSettings = (
  over: Partial<LeaderboardSettings> = {},
): LeaderboardSettings => ({
  points_per_join: 10,
  points_per_host: 25,
  points_per_club_pod: 15,
  points_per_venue_pod: 20,
  points_per_product_sale: 5,
  rewards: [],
  updated_at: '2026-09-01T00:00:00.000Z',
  ...over,
});

/** `updateLeaderboardSettings(input)` for exactly this input — the spec asserts
 * the payload by matching it. */
export const updateLeaderboardSettingsMock = (
  input: Record<string, unknown>,
  opts: { failWith?: string } = {},
): MockedResponse => ({
  request: { query: ADMIN_UPDATE_LEADERBOARD_SETTINGS, variables: { input } },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : {
        result: {
          data: {
            updateLeaderboardSettings: {
              __typename: 'LeaderboardSettings',
              ...makeLeaderboardSettings(),
              rewards: [],
            },
          },
        },
      }),
});
