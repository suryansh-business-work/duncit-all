/**
 * The agent catalogue is code: three agents, each with the only tools it may
 * call and a params schema that refuses what the console must not store.
 */
import { AGENTS, AGENT_KEYS, AGENT_PARAMS, AGENT_SCHEDULE, TOOL_KEYS, agentDefinition, isAgentKey } from '../../agent.catalog';

describe('the catalogue', () => {
  it('ships the three agents, each naming only tools the registry knows', () => {
    expect(AGENT_KEYS).toEqual(['CONTENT_PLANNER', 'COMMUNITY_WATCH', 'ACCOUNT_DOCTOR']);
    for (const key of AGENT_KEYS) {
      const def = AGENTS[key];
      expect(def.key).toBe(key);
      expect(def.name).not.toBe('');
      expect(def.tools.length).toBeGreaterThan(0);
      for (const tool of def.tools) expect(TOOL_KEYS).toContain(tool);
    }
  });

  it('lets only the Content planner post, and only it reads the params and waits on Approvals', () => {
    expect(AGENTS.CONTENT_PLANNER).toMatchObject({ has_params: true, needs_approval: true, schedule: { every: 'WEEK', weekday: 1 } });
    expect(AGENTS.CONTENT_PLANNER.tools).toContain('social.create_post');
    for (const key of ['COMMUNITY_WATCH', 'ACCOUNT_DOCTOR'] as const) {
      expect(AGENTS[key]).toMatchObject({ has_params: false, needs_approval: false, schedule: { every: 'DAY' } });
      expect(AGENTS[key].tools).not.toContain('social.create_post');
      expect(AGENTS[key].tools).not.toContain('social.generate_ideas');
    }
    expect(AGENTS.COMMUNITY_WATCH.tools).toContain('comments.analyze');
    expect(AGENTS.ACCOUNT_DOCTOR.tools).toContain('accounts.health_check');
  });

  it('answers a key with its definition and throws for one it does not know', () => {
    expect(agentDefinition('ACCOUNT_DOCTOR')).toBe(AGENTS.ACCOUNT_DOCTOR);
    expect(() => agentDefinition('LEAD_HUNTER')).toThrow('Unknown marketing agent "LEAD_HUNTER"');
    expect(isAgentKey('CONTENT_PLANNER')).toBe(true);
    expect(isAgentKey('content_planner')).toBe(false);
    expect(isAgentKey(null)).toBe(false);
  });
});

describe('the params schema', () => {
  it('fills the defaults for an empty object', () => {
    expect(AGENT_PARAMS.parse({})).toEqual({ brief: '', networks: [], posts_per_week: 3 });
  });

  it('trims the brief and keeps valid networks', () => {
    expect(AGENT_PARAMS.parse({ brief: '  Monsoon pods  ', networks: ['X', 'LINKEDIN'], posts_per_week: 7 })).toEqual({
      brief: 'Monsoon pods',
      networks: ['X', 'LINKEDIN'],
      posts_per_week: 7,
    });
  });

  it.each([
    ['a brief over 500 characters', { brief: 'x'.repeat(501) }],
    ['an unknown network', { networks: ['TIKTOK'] }],
    ['zero posts a week', { posts_per_week: 0 }],
    ['more than seven posts a week', { posts_per_week: 8 }],
    ['a fractional count', { posts_per_week: 2.5 }],
  ])('refuses %s', (_label, params) => {
    expect(AGENT_PARAMS.safeParse(params).success).toBe(false);
  });
});

describe('the schedule schema', () => {
  it('accepts a day or week schedule within the clock', () => {
    expect(AGENT_SCHEDULE.parse({ every: 'DAY', hour: 0 })).toEqual({ every: 'DAY', hour: 0, weekday: 0 });
    expect(AGENT_SCHEDULE.parse({ every: 'WEEK', hour: 23, weekday: 6 })).toEqual({ every: 'WEEK', hour: 23, weekday: 6 });
  });

  it.each([
    ['an hour of 24', { every: 'DAY', hour: 24 }],
    ['a negative hour', { every: 'DAY', hour: -1 }],
    ['a weekday of 7', { every: 'WEEK', hour: 9, weekday: 7 }],
    ['a cadence it does not know', { every: 'MONTH', hour: 9 }],
  ])('refuses %s', (_label, schedule) => {
    expect(AGENT_SCHEDULE.safeParse(schedule).success).toBe(false);
  });
});
