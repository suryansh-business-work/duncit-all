import type { MockedResponse } from '@apollo/client/testing';
import type { Challenge as SchemaChallenge, ChallengeStats } from '@duncit/gql-types';
import {
  CHALLENGE_STATS,
  DELETE_CHALLENGE,
  DUPLICATE_CHALLENGE,
  type Challenge,
} from '../../src/graphql/challenges';
import {
  CHALLENGE_TOOLS,
  CHALLENGE_TOOL_PRESETS,
  type PresetRow,
  type ToolRow,
} from '../../src/graphql/engine';

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
  | 'created_at'
  | 'participant_mode'
  | 'tool_instances'
  | 'winner_rules';

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
  // A template with no tools yet, ranked by the total: what the server returns
  // for one created before any tool was added.
  participant_mode: 'INDIVIDUAL',
  tool_instances: [],
  winner_rules: {
    __typename: 'ChallengeWinnerRules',
    rank_by: 'TOTAL',
    direction: 'DESC',
    tie_breakers: [],
    podium_size: 3,
  },
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

/** `duplicateChallenge(id)` — resolves to the copy's id, or fails with `error`. */
export const duplicateChallengeMock = (
  over: { id?: string; error?: string } = {},
): MockedResponse => ({
  request: { query: DUPLICATE_CHALLENGE, variables: { id: over.id ?? 'c9' } },
  ...(over.error
    ? { error: new Error(over.error) }
    : { result: { data: { duplicateChallenge: { __typename: 'Challenge', id: 'c9-copy' } } } }),
  maxUsageCount: 20,
});

/* ---- Engine: the tools and presets a template is built from ---- */

export const makeTool = (over: Partial<ToolRow> = {}): ToolRow & { __typename: 'ChallengeTool' } => ({
  __typename: 'ChallengeTool',
  id: 'tool-1',
  tool_type: 'SCORE_COUNTER',
  name: 'Score Counter',
  description: 'Counts points per participant.',
  status: 'ACTIVE',
  version: 1,
  engine_ready: true,
  live_updates: true,
  produces_score: true,
  config_schema_json: '[]',
  default_config_json: '{}',
  mapped_category_ids: [],
  updated_at: '2026-02-02T00:00:00.000Z',
  ...over,
});

export const makePreset = (
  over: Partial<PresetRow> = {},
): PresetRow & { __typename: 'ChallengeToolPreset' } => ({
  __typename: 'ChallengeToolPreset',
  id: 'preset-1',
  tool_id: 'tool-1',
  name: 'Quick round',
  config_json: '{}',
  version: 1,
  is_active: true,
  updated_at: '2026-02-02T00:00:00.000Z',
  ...over,
});

/** `challengeTools` — the Tool Master rows the template form offers. */
export const challengeToolsMock = (
  tools: ToolRow[] = [makeTool()],
  over: { delay?: number } = {},
): MockedResponse => ({
  request: { query: CHALLENGE_TOOLS },
  result: { data: { challengeTools: tools } },
  delay: over.delay,
  maxUsageCount: 20,
});

/** `challengeToolPresets` — saved configurations per tool. */
export const challengeToolPresetsMock = (presets: PresetRow[] = []): MockedResponse => ({
  request: { query: CHALLENGE_TOOL_PRESETS },
  result: { data: { challengeToolPresets: presets } },
  maxUsageCount: 20,
});
