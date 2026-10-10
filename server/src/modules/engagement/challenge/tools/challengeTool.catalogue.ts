/**
 * The universal challenge tools the engine knows how to run.
 *
 * A tool is a reusable primitive (a counter, a vote, a clock), never a sport:
 * "cricket" is a TEMPLATE that combines Score Counter + Numeric Counter + Team
 * Manager + Timer. The TYPE is code because the engine has to implement it; the
 * name, description, default settings and on/off status are database rows an
 * admin edits in Challenge Portal > Tool Master (seeded with `$setOnInsert`).
 *
 * `engine_ready: false` tools are catalogued so admins can see the roadmap, but
 * they cannot be activated or placed in a template until the engine runs them.
 */

export const CHALLENGE_TOOL_TYPES = [
  'SCORE_COUNTER',
  'NUMERIC_COUNTER',
  'TIMER',
  'VOTING',
  'RATING',
  'JUDGE_SCORING',
  'SUBMISSION',
  'LEADERBOARD',
  'TEAM_MANAGER',
  'ROUND_MANAGER',
  'QUIZ',
  'BUZZER',
  'CHECKLIST',
  'CHECKPOINT',
  'MEASUREMENT',
  'PENALTY_BONUS',
  'RANKING',
  'RANDOM_PICKER',
  'POLL',
  'CUSTOM_FORMULA',
] as const;

export type ChallengeToolType = (typeof CHALLENGE_TOOL_TYPES)[number];

/** How a tool turns its events into one number per competitor. */
export type ToolMetric = 'SUM' | 'AGGREGATE' | 'VOTE_COUNT' | 'AVERAGE' | 'JUDGE_AVERAGE' | 'NONE';

/** What an operator does with a tool while the challenge is live. */
export type ToolInput = 'INCREMENT' | 'SET_VALUE' | 'VOTE' | 'RATE' | 'JUDGE' | 'CLOCK' | 'ROUND' | 'NONE';

export type ConfigFieldKind = 'number' | 'boolean' | 'text' | 'select' | 'number_list' | 'criteria';

/** One editable setting of a tool. Labels are localized on the client by key. */
export interface ConfigField {
  key: string;
  kind: ConfigFieldKind;
  default: unknown;
  min?: number;
  max?: number;
  options?: readonly string[];
}

export interface ToolDefinition {
  type: ChallengeToolType;
  name: string;
  description: string;
  engine_ready: boolean;
  metric: ToolMetric;
  input: ToolInput;
  live_updates: boolean;
  input_types: readonly string[];
  output_types: readonly string[];
  fields: readonly ConfigField[];
}

const AGGREGATES = ['MAX', 'MIN', 'SUM', 'LAST'] as const;

/** Settings every scoring tool shares: how much it weighs in the total. */
const SCORING_FIELDS = (countsByDefault: boolean): ConfigField[] => [
  { key: 'counts_toward_total', kind: 'boolean', default: countsByDefault },
  { key: 'weight', kind: 'number', default: 1, min: -100, max: 100 },
];

const COUNTER_FIELDS = (unit: string, increments: number[], counts: boolean): ConfigField[] => [
  { key: 'unit', kind: 'text', default: unit },
  { key: 'increments', kind: 'number_list', default: increments },
  { key: 'allow_negative', kind: 'boolean', default: false },
  { key: 'max_value', kind: 'number', default: 0, min: 0 },
  ...SCORING_FIELDS(counts),
];

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    type: 'SCORE_COUNTER',
    name: 'Score Counter',
    description: 'Custom points, runs, goals or kills added per competitor.',
    engine_ready: true,
    metric: 'SUM',
    input: 'INCREMENT',
    live_updates: true,
    input_types: ['INCREMENT'],
    output_types: ['SCORE'],
    fields: COUNTER_FIELDS('points', [1, 2, 3], true),
  },
  {
    type: 'NUMERIC_COUNTER',
    name: 'Numeric Counter',
    description: 'Repetitions, wickets, fouls or attempts.',
    engine_ready: true,
    metric: 'SUM',
    input: 'INCREMENT',
    live_updates: true,
    input_types: ['INCREMENT'],
    output_types: ['COUNT'],
    fields: COUNTER_FIELDS('count', [1], false),
  },
  {
    type: 'TIMER',
    name: 'Timer / Stopwatch',
    description: 'Countdown or stopwatch clock, with optional per-competitor times.',
    engine_ready: true,
    metric: 'AGGREGATE',
    input: 'CLOCK',
    live_updates: true,
    input_types: ['CLOCK', 'SET_VALUE'],
    output_types: ['DURATION'],
    fields: [
      { key: 'mode', kind: 'select', default: 'STOPWATCH', options: ['STOPWATCH', 'COUNTDOWN'] },
      { key: 'duration_seconds', kind: 'number', default: 600, min: 1, max: 86400 },
      { key: 'record_competitor_times', kind: 'boolean', default: false },
      { key: 'aggregate', kind: 'select', default: 'MIN', options: AGGREGATES },
      ...SCORING_FIELDS(false),
    ],
  },
  {
    type: 'VOTING',
    name: 'Voting',
    description: 'Audience votes for a winner, one vote per voter per round.',
    engine_ready: true,
    metric: 'VOTE_COUNT',
    input: 'VOTE',
    live_updates: true,
    input_types: ['VOTE'],
    output_types: ['VOTES'],
    fields: [{ key: 'allow_self_vote', kind: 'boolean', default: false }, ...SCORING_FIELDS(false)],
  },
  {
    type: 'RATING',
    name: 'Rating',
    description: 'Numeric or star ratings from eligible attendees.',
    engine_ready: true,
    metric: 'AVERAGE',
    input: 'RATE',
    live_updates: true,
    input_types: ['RATE'],
    output_types: ['AVERAGE'],
    fields: [
      { key: 'scale_max', kind: 'number', default: 5, min: 2, max: 10 },
      { key: 'allow_self_rating', kind: 'boolean', default: false },
      ...SCORING_FIELDS(false),
    ],
  },
  {
    type: 'JUDGE_SCORING',
    name: 'Judge Scoring',
    description: 'Assigned judges score each competitor against weighted criteria.',
    engine_ready: true,
    metric: 'JUDGE_AVERAGE',
    input: 'JUDGE',
    live_updates: true,
    input_types: ['JUDGE'],
    output_types: ['SCORE'],
    fields: [
      { key: 'criteria', kind: 'criteria', default: [{ key: 'overall', label: 'Overall', weight: 1, max: 10 }] },
      ...SCORING_FIELDS(true),
    ],
  },
  {
    type: 'SUBMISSION',
    name: 'Submission',
    description: 'Images, videos, audio or artwork submitted by competitors.',
    engine_ready: false,
    metric: 'NONE',
    input: 'NONE',
    live_updates: true,
    input_types: ['MEDIA'],
    output_types: ['GALLERY'],
    fields: [],
  },
  {
    type: 'LEADERBOARD',
    name: 'Leaderboard',
    description: 'Live rankings computed from the challenge scores.',
    engine_ready: true,
    metric: 'NONE',
    input: 'NONE',
    live_updates: true,
    input_types: [],
    output_types: ['RANKING'],
    fields: [{ key: 'show_top', kind: 'number', default: 10, min: 1, max: 100 }],
  },
  {
    type: 'TEAM_MANAGER',
    name: 'Team / Player Manager',
    description: 'Teams and individual players taking part.',
    engine_ready: true,
    metric: 'NONE',
    input: 'NONE',
    live_updates: false,
    input_types: [],
    output_types: ['ROSTER'],
    fields: [
      { key: 'max_teams', kind: 'number', default: 2, min: 2, max: 50 },
      { key: 'max_players_per_team', kind: 'number', default: 11, min: 1, max: 100 },
    ],
  },
  {
    type: 'ROUND_MANAGER',
    name: 'Round / Set Manager',
    description: 'Splits the challenge into rounds or sets.',
    engine_ready: true,
    metric: 'NONE',
    input: 'ROUND',
    live_updates: true,
    input_types: ['ROUND'],
    output_types: ['ROUND'],
    fields: [{ key: 'rounds', kind: 'number', default: 3, min: 1, max: 100 }],
  },
  {
    type: 'QUIZ',
    name: 'Quiz / Answer Tool',
    description: 'Questions and answers with automatic marks.',
    engine_ready: false,
    metric: 'NONE',
    input: 'NONE',
    live_updates: true,
    input_types: ['ANSWER'],
    output_types: ['SCORE'],
    fields: [],
  },
  {
    type: 'BUZZER',
    name: 'Buzzer',
    description: 'Fastest response wins the turn.',
    engine_ready: false,
    metric: 'NONE',
    input: 'NONE',
    live_updates: true,
    input_types: ['BUZZ'],
    output_types: ['ORDER'],
    fields: [],
  },
  {
    type: 'CHECKLIST',
    name: 'Checklist',
    description: 'Task completion tracking.',
    engine_ready: false,
    metric: 'NONE',
    input: 'NONE',
    live_updates: true,
    input_types: ['CHECK'],
    output_types: ['COUNT'],
    fields: [],
  },
  {
    type: 'CHECKPOINT',
    name: 'Checkpoint Tool',
    description: 'QR-based checkpoints along a course.',
    engine_ready: false,
    metric: 'NONE',
    input: 'NONE',
    live_updates: true,
    input_types: ['SCAN'],
    output_types: ['COUNT'],
    fields: [],
  },
  {
    type: 'MEASUREMENT',
    name: 'Measurement Tool',
    description: 'Distance, quantity or performance measurements.',
    engine_ready: true,
    metric: 'AGGREGATE',
    input: 'SET_VALUE',
    live_updates: true,
    input_types: ['SET_VALUE'],
    output_types: ['MEASURE'],
    fields: [
      { key: 'unit', kind: 'text', default: 'm' },
      { key: 'decimals', kind: 'number', default: 2, min: 0, max: 4 },
      { key: 'aggregate', kind: 'select', default: 'MAX', options: AGGREGATES },
      ...SCORING_FIELDS(false),
    ],
  },
  {
    type: 'PENALTY_BONUS',
    name: 'Penalty / Bonus',
    description: 'Add or deduct points.',
    engine_ready: true,
    metric: 'SUM',
    input: 'INCREMENT',
    live_updates: true,
    input_types: ['INCREMENT'],
    output_types: ['SCORE'],
    fields: [
      { key: 'increments', kind: 'number_list', default: [-5, -1, 1, 5] },
      ...SCORING_FIELDS(true),
    ],
  },
  {
    type: 'RANKING',
    name: 'Ranking Tool',
    description: 'Manually assigned finishing positions.',
    engine_ready: true,
    metric: 'AGGREGATE',
    input: 'SET_VALUE',
    live_updates: true,
    input_types: ['SET_VALUE'],
    output_types: ['RANK'],
    fields: [...SCORING_FIELDS(false)],
  },
  {
    type: 'RANDOM_PICKER',
    name: 'Random Picker',
    description: 'Random selection of a competitor or option.',
    engine_ready: false,
    metric: 'NONE',
    input: 'NONE',
    live_updates: true,
    input_types: [],
    output_types: ['PICK'],
    fields: [],
  },
  {
    type: 'POLL',
    name: 'Poll Tool',
    description: 'Polls and preferences.',
    engine_ready: false,
    metric: 'NONE',
    input: 'NONE',
    live_updates: true,
    input_types: ['VOTE'],
    output_types: ['VOTES'],
    fields: [],
  },
  {
    type: 'CUSTOM_FORMULA',
    name: 'Custom Formula',
    description: 'Weighted scoring and calculations.',
    engine_ready: false,
    metric: 'NONE',
    input: 'NONE',
    live_updates: false,
    input_types: [],
    output_types: ['SCORE'],
    fields: [],
  },
];

const BY_TYPE = new Map(TOOL_DEFINITIONS.map((d) => [d.type, d]));

export function toolDefinition(type: string): ToolDefinition | undefined {
  return BY_TYPE.get(type as ChallengeToolType);
}

/** A RANKING position is better when lower; every other metric when higher. */
export function metricDirection(type: string): 'ASC' | 'DESC' {
  return type === 'RANKING' ? 'ASC' : 'DESC';
}
