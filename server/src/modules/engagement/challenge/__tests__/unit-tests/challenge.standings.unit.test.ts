import {
  computeStandings,
  metricTools,
  winnersOf,
  TOTAL_KEY,
  type StandingsTool,
  type StandingsScoreEvent,
  type StandingsVote,
  type WinnerRules,
} from '../../runtime/challenge.standings';

const A = { competitor_id: 'a', name: 'Alpha' };
const B = { competitor_id: 'b', name: 'Bravo' };
const C = { competitor_id: 'c', name: 'Charlie' };
const rulesDesc: WinnerRules = { rank_by: TOTAL_KEY, direction: 'DESC', tie_breakers: [], podium_size: 3 };

const tool = (instance_id: string, tool_type: string, config: Record<string, unknown> = {}): StandingsTool => ({
  instance_id,
  tool_type,
  label: instance_id,
  config,
});
const ev = (tool_instance_id: string, competitor_id: string, event_type: string, value: number, item_key?: string): StandingsScoreEvent => ({
  tool_instance_id,
  competitor_id,
  event_type,
  value,
  item_key,
});
const vote = (v: Partial<StandingsVote> & Pick<StandingsVote, 'tool_instance_id' | 'kind' | 'candidate_id'>): StandingsVote => ({
  value: 1,
  ...v,
});

const run = (input: Partial<Parameters<typeof computeStandings>[0]> & { tools: StandingsTool[] }) =>
  computeStandings({ competitors: [A, B], events: [], votes: [], rules: rulesDesc, ...input });
const byId = (rows: ReturnType<typeof run>, id: string) => rows.find((r) => r.competitor_id === id)!;

describe('computeStandings counters and totals', () => {
  it('sums INCREMENT events, weights the total and ranks highest first', () => {
    const t = tool('runs', 'SCORE_COUNTER', { counts_toward_total: true, weight: 2 });
    const rows = run({
      tools: [t],
      events: [ev('runs', 'a', 'INCREMENT', 1), ev('runs', 'a', 'INCREMENT', 4), ev('runs', 'b', 'INCREMENT', 6), ev('runs', 'b', 'SET', 99), ev('other', 'b', 'INCREMENT', 50)],
    });
    expect(rows.map((r) => [r.competitor_id, r.rank, r.total])).toEqual([
      ['b', 1, 12],
      ['a', 2, 10],
    ]);
    expect(byId(rows, 'a').metrics.runs).toBe(5);
  });

  it('keeps a metric out of the total unless counts_toward_total is on, and defaults weight to 1', () => {
    const off = tool('off', 'SCORE_COUNTER', { counts_toward_total: false, weight: 5 });
    const on = tool('on', 'SCORE_COUNTER', { counts_toward_total: true });
    const rows = run({ tools: [off, on], events: [ev('off', 'a', 'INCREMENT', 10), ev('on', 'a', 'INCREMENT', 3)] });
    expect(byId(rows, 'a')).toMatchObject({ total: 3, metrics: { off: 10, on: 3 } });
  });

  it('rounds to four decimals', () => {
    const t = tool('m', 'SCORE_COUNTER', { counts_toward_total: true, weight: 1 });
    const rows = run({ tools: [t], events: [ev('m', 'a', 'INCREMENT', 0.123456)] });
    expect(byId(rows, 'a').metrics.m).toBe(0.1235);
  });

  it('aggregates SET events with MIN, SUM, LAST and the MAX default; RANKING always takes the last', () => {
    const events = [ev('t', 'a', 'SET', 5), ev('t', 'a', 'SET', 2), ev('t', 'a', 'SET', 9), ev('t', 'a', 'SET', 4)];
    const metric = (type: string, aggregate?: string) =>
      byId(run({ tools: [tool('t', type, { aggregate })], events }), 'a').metrics.t;
    expect(metric('TIMER', 'MIN')).toBe(2);
    expect(metric('TIMER', 'SUM')).toBe(20);
    expect(metric('TIMER', 'LAST')).toBe(4);
    expect(metric('TIMER')).toBe(9);
    expect(metric('RANKING', 'MAX')).toBe(4);
  });

  it('gives a competitor with no SET events a null metric and nothing in the total', () => {
    const t = tool('t', 'TIMER', { counts_toward_total: true });
    const rows = run({ tools: [t], events: [ev('t', 'a', 'SET', 7)] });
    expect(byId(rows, 'b')).toMatchObject({ total: 0, metrics: { t: null } });
  });
});

describe('computeStandings votes, judges, quiz and buzzer', () => {
  it('counts VOTE ballots per candidate', () => {
    const rows = run({
      tools: [tool('v', 'VOTING')],
      votes: [
        vote({ tool_instance_id: 'v', kind: 'VOTE', candidate_id: 'a' }),
        vote({ tool_instance_id: 'v', kind: 'VOTE', candidate_id: 'a' }),
        vote({ tool_instance_id: 'v', kind: 'VOTE', candidate_id: 'b' }),
        vote({ tool_instance_id: 'v', kind: 'RATING', candidate_id: 'b' }),
      ],
    });
    expect([byId(rows, 'a').metrics.v, byId(rows, 'b').metrics.v]).toEqual([2, 1]);
  });

  it('averages RATING ballots and leaves unrated competitors null', () => {
    const rows = run({
      tools: [tool('r', 'RATING')],
      votes: [
        vote({ tool_instance_id: 'r', kind: 'RATING', candidate_id: 'a', value: 4 }),
        vote({ tool_instance_id: 'r', kind: 'RATING', candidate_id: 'a', value: 5 }),
      ],
    });
    expect(byId(rows, 'a').metrics.r).toBe(4.5);
    expect(byId(rows, 'b').metrics.r).toBeNull();
  });

  it('scores judge sheets by weighted criteria and ignores unknown criteria', () => {
    const criteria = [
      { key: 'style', label: 'Style', weight: 2, max: 10 },
      { key: 'tech', label: 'Tech', weight: 1, max: 10 },
    ];
    const rows = run({
      tools: [tool('j', 'JUDGE_SCORING', { criteria })],
      votes: [
        vote({ tool_instance_id: 'j', kind: 'JUDGE', candidate_id: 'a', criteria: [{ key: 'style', value: 5 }, { key: 'tech', value: 4 }, { key: 'zzz', value: 100 }] }),
        vote({ tool_instance_id: 'j', kind: 'JUDGE', candidate_id: 'a', criteria: [{ key: 'style', value: 1 }] }),
        vote({ tool_instance_id: 'j', kind: 'JUDGE', candidate_id: 'b', criteria: null }),
      ],
    });
    expect(byId(rows, 'a').metrics.j).toBe(8);
    expect(byId(rows, 'b').metrics.j).toBe(0);
  });

  it('judge scoring without configured criteria scores 0', () => {
    const rows = run({
      tools: [tool('j', 'JUDGE_SCORING')],
      votes: [vote({ tool_instance_id: 'j', kind: 'JUDGE', candidate_id: 'a', criteria: [{ key: 'x', value: 3 }] })],
    });
    expect(byId(rows, 'a').metrics.j).toBe(0);
  });

  it('awards quiz points once per correctly answered question', () => {
    const questions = [
      { key: 'q1', label: 'One', options: ['x', 'y'], correct: 1, points: 3 },
      { key: 'q2', label: 'Two', options: ['x', 'y'], correct: 0, points: 2 },
    ];
    const rows = run({
      tools: [tool('q', 'QUIZ', { questions })],
      votes: [
        vote({ tool_instance_id: 'q', kind: 'ANSWER', candidate_id: 'a', scope_key: 'q1', value: 1 }),
        vote({ tool_instance_id: 'q', kind: 'ANSWER', candidate_id: 'a', scope_key: 'q1', value: 1 }),
        vote({ tool_instance_id: 'q', kind: 'ANSWER', candidate_id: 'a', scope_key: 'q2', value: 1 }),
        vote({ tool_instance_id: 'q', kind: 'ANSWER', candidate_id: 'b', scope_key: 'q2', value: 0 }),
      ],
    });
    expect(byId(rows, 'a').metrics.q).toBe(3);
    expect(byId(rows, 'b').metrics.q).toBe(2);
  });

  it('quiz with no configured questions scores 0', () => {
    const rows = run({ tools: [tool('q', 'QUIZ')], votes: [vote({ tool_instance_id: 'q', kind: 'ANSWER', candidate_id: 'a', scope_key: 'q1' })] });
    expect(byId(rows, 'a').metrics.q).toBe(0);
  });

  it('gives each buzz round to the earliest press and multiplies by points_per_win', () => {
    const at = (s: number) => new Date(2026, 0, 1, 0, 0, s);
    const rows = run({
      tools: [tool('z', 'BUZZER', { points_per_win: 5 })],
      votes: [
        vote({ tool_instance_id: 'z', kind: 'BUZZ', candidate_id: 'b', scope_key: 'r1', created_at: at(2) }),
        vote({ tool_instance_id: 'z', kind: 'BUZZ', candidate_id: 'a', scope_key: 'r1', created_at: at(1) }),
        vote({ tool_instance_id: 'z', kind: 'BUZZ', candidate_id: 'b', scope_key: 'r2', created_at: at(3) }),
        vote({ tool_instance_id: 'z', kind: 'BUZZ', candidate_id: 'a', scope_key: 'r2', created_at: null }),
        vote({ tool_instance_id: 'z', kind: 'BUZZ', candidate_id: 'b', scope_key: null, created_at: at(4) }),
      ],
    });
    expect(byId(rows, 'a').metrics.z).toBe(10);
    expect(byId(rows, 'b').metrics.z).toBe(5);
  });

  it('a buzzer with no points_per_win scores 0', () => {
    const rows = run({ tools: [tool('z', 'BUZZER')], votes: [vote({ tool_instance_id: 'z', kind: 'BUZZ', candidate_id: 'a', scope_key: 'r1' })] });
    expect(byId(rows, 'a').metrics.z).toBe(0);
  });
});

describe('computeStandings checklists and formulas', () => {
  const items = [
    { key: 'i1', points: 2 },
    { key: 'i2', points: 5 },
  ];

  it('scores only the items whose latest tick is done', () => {
    const rows = run({
      tools: [tool('c', 'CHECKLIST', { items })],
      events: [
        ev('c', 'a', 'SET', 1, 'i1'),
        ev('c', 'a', 'SET', 1, 'i2'),
        ev('c', 'a', 'SET', 0, 'i2'),
        ev('c', 'b', 'SET', 1, 'gone'),
      ],
    });
    expect(byId(rows, 'a').metrics.c).toBe(2);
    expect(byId(rows, 'b').metrics.c).toBe(0);
  });

  it('a checklist without items scores 0', () => {
    const rows = run({ tools: [tool('c', 'CHECKLIST')], events: [ev('c', 'a', 'SET', 1, 'i1')] });
    expect(byId(rows, 'a').metrics.c).toBe(0);
  });

  it('formulas combine every instance of the named tool types after the others are computed', () => {
    const formula = tool('f', 'CUSTOM_FORMULA', {
      counts_toward_total: true,
      weight: 1,
      terms: [{ type: 'SCORE_COUNTER', weight: 2 }, { type: 'TIMER', weight: -1 }],
    });
    const rows = run({
      tools: [formula, tool('s1', 'SCORE_COUNTER'), tool('s2', 'SCORE_COUNTER'), tool('t', 'TIMER')],
      events: [ev('s1', 'a', 'INCREMENT', 3), ev('s2', 'a', 'INCREMENT', 2), ev('t', 'a', 'SET', 4)],
    });
    expect(byId(rows, 'a').metrics.f).toBe(6);
    expect(byId(rows, 'a').total).toBe(6);
    // b has no timer value: a null source counts as 0
    expect(byId(rows, 'b').metrics.f).toBe(0);
  });

  it('a formula with no terms is 0', () => {
    const rows = run({ tools: [tool('f', 'CUSTOM_FORMULA')] });
    expect(byId(rows, 'a').metrics.f).toBe(0);
  });

  it('ignores tools that produce no number and unknown types', () => {
    const rows = run({ tools: [tool('l', 'LEADERBOARD'), tool('u', 'NOT_A_TOOL')] });
    expect(byId(rows, 'a').metrics).toEqual({});
    expect(metricTools([tool('l', 'LEADERBOARD'), tool('u', 'NOT_A_TOOL'), tool('s', 'SCORE_COUNTER')]).map((t) => t.instance_id)).toEqual(['s']);
  });
});

describe('computeStandings ranking', () => {
  const t = tool('s', 'SCORE_COUNTER', { counts_toward_total: true, weight: 1 });
  const inc = (id: string, n: number) => ev('s', id, 'INCREMENT', n);

  it('shares a rank on a full tie, skips the next, and orders ties by name', () => {
    const rows = run({ tools: [t], competitors: [C, B, A], events: [inc('a', 5), inc('b', 5), inc('c', 1)] });
    expect(rows.map((r) => [r.name, r.rank])).toEqual([
      ['Alpha', 1],
      ['Bravo', 1],
      ['Charlie', 3],
    ]);
    expect(winnersOf(rows)).toEqual(['a', 'b']);
  });

  it('honours ASC direction so the lowest value wins', () => {
    const rows = run({ tools: [t], events: [inc('a', 9), inc('b', 2)], rules: { ...rulesDesc, direction: 'ASC' } });
    expect(rows.map((r) => r.competitor_id)).toEqual(['b', 'a']);
  });

  it('uses tie-breakers in order and ranks missing values last in either direction', () => {
    const timer = tool('t', 'TIMER');
    const events = [inc('a', 5), inc('b', 5), inc('c', 5), ev('t', 'a', 'SET', 30), ev('t', 'b', 'SET', 10)];
    for (const direction of ['ASC', 'DESC'] as const) {
      const rows = run({
        tools: [t, timer],
        competitors: [C, B, A],
        events,
        rules: { ...rulesDesc, tie_breakers: [{ rank_by: 't', direction }] },
      });
      const expected = direction === 'ASC' ? ['b', 'a', 'c'] : ['a', 'b', 'c'];
      expect(rows.map((r) => r.competitor_id)).toEqual(expected);
      expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    }
  });

  it('can rank directly by a tool instance metric', () => {
    const rows = run({
      tools: [t],
      events: [inc('a', 1), inc('b', 8)],
      rules: { rank_by: 's', direction: 'DESC', tie_breakers: [], podium_size: 1 },
    });
    expect(winnersOf(rows)).toEqual(['b']);
  });

  it('ranks nobody when there are no competitors', () => {
    expect(run({ tools: [t], competitors: [] })).toEqual([]);
    expect(winnersOf([])).toEqual([]);
  });
});
