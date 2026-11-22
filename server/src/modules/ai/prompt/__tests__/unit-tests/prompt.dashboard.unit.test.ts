/**
 * The AI Library dashboard's summary.
 *
 * What has to hold:
 *  - counts split by kind (and code prompts by role), with only active AI
 *    prompts counted as active;
 *  - an edited code prompt is one whose `matches_default` is false; a catalogue
 *    key with no library row is counted as missing;
 *  - a prompt's usage is the sum of the features it names, and a task that is
 *    not a feature adds nothing;
 *  - category and model groups are biggest first, then by name.
 */
import { summariseLibrary, type FeatureUsageRow } from '../../prompt.dashboard';
import type { PublicAiPrompt } from '../../prompt.service';

const prompt = (over: Partial<PublicAiPrompt> = {}): PublicAiPrompt => ({
  id: 'p1',
  key: 'moderation.pod',
  kind: 'CODE',
  matches_default: true,
  role: 'SYSTEM',
  name: 'Pod review',
  description: '',
  content: 'Review this pod',
  category: 'Moderation',
  target_model: 'gpt-4o',
  variables: [],
  tasks: ['moderation.pod'],
  usage: [],
  token_count: 120,
  is_active: true,
  created_by: null,
  created_at: null,
  updated_at: '2026-11-20T10:00:00.000Z',
  ...over,
});

const feature = (over: Partial<FeatureUsageRow> = {}): FeatureUsageRow => ({
  key: 'moderation.pod',
  calls: 0,
  failed_calls: 0,
  total_tokens: 0,
  cost_usd: 0,
  prompts: [{}],
  ...over,
});

const ROWS = [
  prompt(),
  prompt({ id: 'p2', key: 'moderation.pod.user', role: 'USER', matches_default: false, token_count: 10 }),
  prompt({
    id: 'p3',
    key: 'crm.parse_lead',
    category: 'CRM',
    target_model: '',
    tasks: ['crm.lead_parse', 'crm.lead_chat', 'gone.feature'],
  }),
  prompt({ id: 'p4', key: 'my-prompt', kind: 'AI', matches_default: null, category: 'CRM', tasks: [] }),
  prompt({ id: 'p5', key: 'old-prompt', kind: 'AI', matches_default: null, is_active: false, tasks: [] }),
];

const FEATURES = [
  feature({ calls: 10, failed_calls: 1, total_tokens: 500, cost_usd: 0.1 }),
  feature({ key: 'crm.lead_parse', calls: 3, total_tokens: 30, cost_usd: 0.0000004 }),
  feature({ key: 'crm.lead_chat', calls: 2, failed_calls: 2, total_tokens: 20, cost_usd: 0.0000003 }),
  feature({ key: 'automation.compose', prompts: [] }),
];

describe('summariseLibrary', () => {
  const summary = summariseLibrary(ROWS, FEATURES, 30, [
    'moderation.pod',
    'moderation.pod.user',
    'crm.parse_lead',
    'crm.parse_lead.user',
  ]);

  it('counts prompts by kind, role and state', () => {
    expect(summary).toMatchObject({
      range_days: 30,
      code_prompts: 3,
      system_prompts: 2,
      user_prompts: 1,
      ai_prompts: 2,
      active_ai_prompts: 1,
      edited_code_prompts: 1,
      missing_code_prompts: 1,
      features_total: 4,
      features_with_prompt: 3,
    });
  });

  it('gives each prompt the summed usage of the features it serves', () => {
    const byId = new Map(summary.prompts.map((row) => [row.id, row]));

    expect(byId.get('p1')).toMatchObject({ features: ['moderation.pod'], calls: 10, failed_calls: 1, total_tokens: 500, cost_usd: 0.1 });
    // A task that is not a feature contributes nothing and is not listed.
    expect(byId.get('p3')).toMatchObject({
      features: ['crm.lead_parse', 'crm.lead_chat'],
      calls: 5,
      failed_calls: 2,
      total_tokens: 50,
      cost_usd: 0.000001,
    });
    expect(byId.get('p4')).toMatchObject({ features: [], calls: 0, cost_usd: 0, matches_default: null });
  });

  it('keeps every library fact the dashboard links and charts by', () => {
    expect(summary.prompts[1]).toEqual(
      expect.objectContaining({
        id: 'p2',
        key: 'moderation.pod.user',
        kind: 'CODE',
        role: 'USER',
        name: 'Pod review',
        category: 'Moderation',
        target_model: 'gpt-4o',
        token_count: 10,
        is_active: true,
        matches_default: false,
        updated_at: '2026-11-20T10:00:00.000Z',
      }),
    );
  });

  it('groups by category and model, biggest first, then by name', () => {
    expect(summary.by_category).toEqual([
      { key: 'Moderation', code: 2, ai: 1 },
      { key: 'CRM', code: 1, ai: 1 },
    ]);
    expect(summary.by_model).toEqual([
      { key: 'gpt-4o', code: 2, ai: 2 },
      { key: '', code: 1, ai: 0 },
    ]);
  });

  it('defaults the catalogue to the shipped code prompts', () => {
    const empty = summariseLibrary([], [], 7);

    expect(empty.missing_code_prompts).toBeGreaterThan(0);
    expect(empty).toMatchObject({ range_days: 7, code_prompts: 0, features_total: 0, by_category: [], prompts: [] });
  });
});
