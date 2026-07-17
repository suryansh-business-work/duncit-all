import type { MockedResponse } from '@apollo/client/testing';
import type { Challenge as SchemaChallenge, ChallengeStats } from '@duncit/gql-types';
import {
  CHALLENGE_STATS,
  DELETE_CHALLENGE,
  type Challenge,
} from '../../src/graphql/challenges';

/**
 * Challenge-domain mocks. Every factory is bound to the generated
 * `@duncit/gql-types` schema so a server-side field change breaks typecheck
 * here first. `makeChallenge` returns the app's `Challenge` projection typed as
 * a schema-synced `Pick` of the canonical `Challenge` (plus `__typename`), so
 * the MockedProvider cache matches production without `addTypename={false}`.
 */
type ChallengeFields =
  | 'id'
  | 'name'
  | 'description'
  | 'super_category_id'
  | 'category_id'
  | 'sub_category_id'
  | 'super_category_name'
  | 'category_name'
  | 'sub_category_name'
  | 'is_active'
  | 'created_at';

/** The app row projection, proven a subset of the canonical schema type. */
export type ChallengeMock = Pick<SchemaChallenge, ChallengeFields> & {
  __typename: 'Challenge';
};

export const makeChallenge = (over: Partial<ChallengeMock> = {}): Challenge & ChallengeMock => ({
  __typename: 'Challenge',
  id: 'c9',
  name: 'Sample Challenge',
  description: 'A short blurb',
  super_category_id: null,
  category_id: null,
  sub_category_id: null,
  super_category_name: null,
  category_name: null,
  sub_category_name: null,
  is_active: true,
  created_at: '2026-02-02T00:00:00.000Z',
  ...over,
});

export const makeChallengeStats = (over: Partial<ChallengeStats> = {}): ChallengeStats => ({
  __typename: 'ChallengeStats',
  total: 0,
  active: 0,
  ...over,
});

/* ---- Apollo MockedResponse builders ---- */

/** `challengeStats { total active }` — the dashboard + mutation-refetch query. */
export const challengeStatsMock = (
  stats: ChallengeStats = makeChallengeStats(),
): MockedResponse => ({
  request: { query: CHALLENGE_STATS },
  result: { data: { challengeStats: stats } },
  maxUsageCount: 20,
});

/** `deleteChallenge(id)` — resolves to a boolean; `delay` exposes the loading UI. */
export const deleteChallengeMock = (
  over: { id?: string; delay?: number } = {},
): MockedResponse => ({
  request: { query: DELETE_CHALLENGE, variables: { id: over.id ?? 'c9' } },
  result: { data: { deleteChallenge: true } },
  delay: over.delay,
  maxUsageCount: 20,
});
